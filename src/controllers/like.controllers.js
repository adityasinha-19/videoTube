import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comment.model.js";
import { Tweet } from "../models/tweet.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: toggle like on video

  if (!isValidObjectId(videoId.trim())) {
    throw new ApiError(400, "Invalid video Id");
  }

  const video = await Video.findById(videoId);

  if (video.owner !== req.user._id) {
    throw new ApiError(401, "Unauthorized request");
  }

  const like = await Like.create({
    likedBy: req.user._id,
  });

  if (!like) {
    throw new ApiError(400, "Error while updating user like");
  }

  const videoLike = await Like.findByIdAndUpdate(
    like._id,
    {
      $set: {
        video: video._id,
      },
    },
    {
      new: true,
    }
  );

  if (!videoLike) {
    throw new ApiError(500, "Error while liking the video");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, videoLike, "video has been liked successfully"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  //TODO: toggle like on comment

  if (!isValidObjectId(commentId.trim())) {
    throw new ApiError(400, "Invalid comment id");
  }

  const comment = await Comment.findById(commentId);

  if (comment.owner !== req.user._id) {
    throw new ApiError(401, "Unauthorized request");
  }

  const like = await Like.find({ likedBy: req.user._id });

  const commentLike = await Like.findByIdAndUpdate(
    like._id,
    {
      $set: {
        comment: comment._id,
      },
    },
    {
      new: true,
    }
  );

  if (!commentLike) {
    throw new ApiError(400, "Error while liking the comment");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, commentLike, "Comment has been liked succesfully")
    );
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  //TODO: toggle like on tweet
  if (!isValidObjectId(tweetId.trim())) {
    throw new ApiError(400, "invalid tweet id");
  }

  const tweet = await Tweet.findById(tweetId);

  if (tweet.owner !== req.user._id) {
    throw new ApiError(401, "Unautorized request");
  }

  const like = await Like.find({ likedBy: req.user._id });

  const tweetLike = await Like.findByIdAndUpdate(
    like._id,
    {
      $set: {
        tweet: tweet._id,
      },
    },
    {
      new: true,
    }
  );

  if (!tweetLike) {
    throw new ApiError(500, "Error while liking the tweet");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, tweetLike, "Tweet has been liked succesfully"));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos

  const likedVideos = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likedVideos",
      },
    },
    {
      $addFields: {
        $first: "$likedVideos",
      },
    },
  ]);

  if (!likedVideos) {
    throw new ApiError(500, "Error while fetching liked videos");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, likedVideos, "liked videos fetched successfully")
    );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
