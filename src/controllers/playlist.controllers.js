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

  if ([name, description]?.some((field) => field.trim() === "")) {
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

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user id");
  }

  if (req.user._id.toString() !== userId.toString()) {
    throw new ApiError(403, "You are forbidden to access this data");
  }

  const userPlaylists = await Playlist.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
  ]);

  // Alternate and less expensive approach to fetch the lists of playlist
  // const userPlaylists = await Playlist.find({ owner: userId }).lean();

  if (userPlaylists.length === 0) {
    return res.status(200).json(new ApiResponse(200, [], "No playlist found"));
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, userPlaylists, "user playlist fetched successfully")
    );
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  //TODO: get playlist by id

  if (!isValidObjectId(playlistId)) {
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

  if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
    throw new ApiError("invalid playlist or video id");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const updatedPlaylist = await Playlist.findOneAndUpdate(
    { _id: playlistId, owner: req.user._id },
    {
      $addToSet: {
        videos: videoId, // adds the video to videos array
      },
    },
    {
      new: true,
    }
  );

  if (!updatedPlaylist) {
    throw new ApiError(
      500,
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

  if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid playlist or video id");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const updatedPlaylist = await Playlist.findOneAndUpdate(
    { _id: playlistId, owner: req.user._id },
    {
      $pull: {
        videos: videoId, // removes the video from videos array
      },
    },
    {
      new: true,
    }
  );

  if (!updatedPlaylist) {
    throw new ApiError(500, "Error while removing video from playlist");
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

  const deletePlaylist = await Playlist.findByIdAndDelete(playlistId);
  if (!deletePlaylist) {
    throw new ApiError(500, "Something went wrong while deleting the playlist");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "playlist has been deleted successfully"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;
  //TODO: update playlist

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist id");
  }

  if ([name, description]?.some((field) => field.trim() === "")) {
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
