import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  //TODO: create playlist

  if ([name, description].some((field) => field.trim() === "")) {
    throw new ApiError(400, "name and description are required");
  }

  const playlist = await Playlist.create({
    name,
    description,
    owner: req.user?._id,
  });

  if (!playlist) {
    throw new ApiError(500, "Something went wrong while creating playlist");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, playlist, "PLaylist has been succesfully created")
    );
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  //TODO: get user playlists

  if (!isValidObjectId(userId.trim())) {
    throw new ApiError(400, "Invalid user id");
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(400, "User not found");
  }

  const userPlaylists = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(user._id),
      },
    },
    {
      $lookup: {
        from: "playlists",
        foreignField: "owner",
        localField: "_id",
        as: "userPlaylists",
      },
    },
    {
      $addFields: {
        $first: "$userPlaylists",
      },
    },
  ]);

  if (!userPlaylists) {
    throw new ApiError(400, `Error while fetching user's playlist`);
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        userPlaylists[0],
        "user playlist fetched successfully"
      )
    );
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  //TODO: get playlist by id

  if (!isValidObjectId(playlistId.trim())) {
    throw new ApiError(400, "Invalid playlist id");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(500, "Error while fetching playlist");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "playlist fetched succesfully"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (isValidObjectId(playlistId.trim(), videoId.trim())) {
    throw new ApiError("invalid playlist or video id");
  }

  const video = await Video.findById(videoId);

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $addToSet: {
        videos: {
          $each: [video._id],
        },
      },
    },
    {
      new: true,
    }
  );

  if (!updatedPlaylist) {
    throw new ApiError(
      400,
      "something went wrong while adding video to playlist"
    );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedPlaylist,
        "Video has been added to the playlist"
      )
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  // TODO: remove video from playlist

  if (!isValidObjectId(playlistId.trim(), videoId.trim())) {
    throw new ApiError(400, "Invalid playlist or video id");
  }

  const video = await Video.findById(videoId);

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $pull: {
        videos: {
          $in: [video._id],
        },
      },
    },
    {
      new: true,
    }
  );

  if (!updatedPlaylist) {
    throw new ApiError(400, "Error while removing video from playlist");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Video has been removed from playlist successfully")
    );
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  // TODO: delete playlist

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist id");
  }

  await Playlist.findByIdAndDelete(playlistId);

  return res
    .status(200)
    .json(new ApiResponse(200, "playlist has been deleted successfully"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;
  //TODO: update playlist

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist id");
  }

  if ([name, description].some((field) => field.trim() === "")) {
    throw new ApiError(400, "name and description are required");
  }

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $set: {
        name,
        description,
      },
    },
    {
      new: true,
    }
  );

  if (!updatedPlaylist) {
    throw new ApiError(500, "something went wrong while updating playlist");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedPlaylist,
        "Playlist has been updated successfully"
      )
    );
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
