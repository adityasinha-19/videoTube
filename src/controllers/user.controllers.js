import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);

    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "something went wrong while generating access and refresh token "
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // get required info from frontend
  // validate the input
  // check if the user already exists, using email or username
  // check for images, esp. avatar
  // upload them to cloudinary, again check for avatar
  // create user object in db
  // check user is created
  // remove password and response field from response
  // send the response to user

  const { fullName, email, username, password } = req.body;

  if (
    [fullName, email, username, password].some((field) => field.trim() === "")
  ) {
    throw new ApiError(400, "required field missing");
  }

  const existedUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existedUser) {
    throw new ApiError(400, "user already exists");
  }

  const avatarLocalFilePath = req.files?.avatar[0]?.path;
  let coverImageLocalFilePath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalFilePath = req.files.coverImage[0].path;
  }

  if (!avatarLocalFilePath) {
    throw new ApiError(400, "avatar is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalFilePath);
  const coverImage = await uploadOnCloudinary(coverImageLocalFilePath);

  if (!avatar) {
    throw new ApiError(500, "avatar not uploaded");
  }
  if (!coverImage) {
    throw new ApiError(500, "cover image not uploaded");
  }

  const user = await User.create({
    fullName,
    email,
    username: username.toLowerCase(),
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "something went wrong while regestring user");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "user registerd succesfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // get data for req.body
  // check the username and email
  // find the user
  // match for password
  // generate access and refresh token
  // remove password and refreshToken from model
  // send cookies
  // return response

  const { email, username, password } = req.body;

  if (!(username || email)) {
    throw new ApiError(400, "email and username is required");
  }

  const user = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (!user) {
    throw new ApiError(400, "user does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(400, "password incorrect");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "user logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  // update refreshToken to undefined
  // clear cookies of acc.token and refreshToken

  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: undefined },
    },
    {
      new: true,
    }
  );

  // const user = await User.findById(req.user._id);
  // user.refreshToken = undefined;
  // await user.save({ validateBeforeSave: false });

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "user logged out succesfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  // get the refreshToken from user(you sent it remember)

  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }

  const decodedToken = jwt.verify(
    incomingRefreshToken,
    process.env.REFRESH_TOKEN_SECRET
  );

  const user = await User.findById(decodedToken?._id);

  if (!user) {
    throw new ApiError(400, "invalid refresh token");
  }

  if (incomingRefreshToken !== user?.refreshToken) {
    throw new ApiError(401, "Refresh token is expired or used");
  } // i think its optional becoz if incoming refresh token is wrong then it can't be decoded and hence we won't get the right user

  const { accessToken, refreshToken: newRefreshToken } =
    await generateAccessAndRefreshToken(user._id);

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          accessToken,
          refreshToken: newRefreshToken,
        },
        "access token refreshed succesfully"
      )
    );
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id);

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "invalid password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "password changed succesfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "user fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { email, username, fullName } = req.body;

  if (!email || !username || !fullName) {
    throw new ApiError(400, "all fields are mandatory");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        email,
        username,
        fullName,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "account details updated succesfully"));
});

const updateAvatarImage = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "avatar file is missing");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar) {
    throw new ApiError(500, "somthing went wrong while uploading avatar ");
  }

  const user = User.findById(req.user._id);
  const oldAvatarUrl = user.avatar;

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    {
      new: true,
    }
  ).select("password");

  await deleteFromCloudinary(oldAvatarUrl);

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "avatar updated succesfully"));
});

const updateCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "cover image is missing");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage) {
    throw new ApiError(
      500,
      "something went wrong while uploading cover image "
    );
  }

  const user = await User.findById(req.user._id);

  const oldCoverImageUrl = user.coverImage;

  const updateduser = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  if (oldCoverImageUrl) {
    try {
      await deleteFromCloudinary(oldCoverImageUrl);
    } catch (error) {
      throw new ApiError(500, "old cover image deketion failed");
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updateduser, "cover image updated succesfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username.trim()) {
    throw new ApiError(400, "username is required");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        subscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribedTo.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        email: 1,
        avatar: 1,
        coverImage: 1,
        subscribersCount: 1,
        subscribedToCount: 1,
        isSubscribed: 1,
      },
    },
  ]);

  if (!channel.length) {
    throw new ApiError(400, "something went wrong");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "channel profile fetched successfully")
    );
});

const getUserWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              foreignField: "_id",
              localField: "owner",
              as: "owner",
            },
          },
          {
            $project: {
              username: 1,
              fullName: 1,
              avatar: 1,
            },
          },
          {
            $addFields: {
              owner: {
                $first: $owner,
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "user watch history fetched successfully"
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateAvatarImage,
  updateCoverImage,
  getUserChannelProfile,
  getUserWatchHistory,
};
