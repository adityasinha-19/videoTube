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

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video Id");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // check if like already exists in video -> if yes then delete it i.e., unlike
  const deleteLike = await Like.findOneAndDelete({
    likedBy: req.user._id,
    video: videoId,
  });
  if (deleteLike) {
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Video Like removed successfully"));
  }

  // create new like
  const like = await Like.create({
    likedBy: req.user._id,
    video: videoId,
  });

  if (!like) {
    throw new ApiError(500, "Something went wrong while updating user like");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, like, "video has been liked successfully"));
});

/*
const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // check for existing like
  const existingLike = await Like.findOne({
    video: videoId,
    likedBy: req.user._id,
  });

  // delete the existing like
  if (existingLike) {
    const deleteLike = await Like.findByIdAndDelete(existingLike._id);
    if (!deleteLike) {
      throw new ApiError(500, "Something went wrong while unliking the video");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Unliked the video succesfully"));
  }

  // create new like
  const newLike = await Like.create({
    video: videoId,
    likedBy: req.user._id,
  });
  if (!newLike) {
    throw new ApiError(500, "Something went wrong while liking the video");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, newLike, "Liked the video succesfully"));
});
*/

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  //TODO: toggle like on comment

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment Id");
  }

  // check if comment exists
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  // check if comment is already liked -> if yes then delete, else create new one

  const deletedLike = await Like.findOneAndDelete({
    likedBy: req.user._id,
    comment: commentId,
  });
  if (deletedLike) {
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Comment Like removed successully"));
  }

  const newLike = await Like.create({
    likedBy: req.user._id,
    comment: commentId,
  });
  if (!newLike) {
    throw new ApiError(500, "Something went wrong while liking the comment");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, newLike, "Comment liked successfully"));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  //TODO: toggle like on tweet
  if (!isValidObjectId(tweetId.trim)) {
    throw new ApiError(400, "Invalid tweet id");
  }

  // check if tweet exists
  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(200, "Tweet not found");
  }

  // check if tweet is already liked -> if yes then remove the like
  const deleteLike = await Like.findOneAndDelete({
    tweet: tweetId,
    likedBy: req.user._id,
  });
  if (deleteLike) {
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Tweet like removed successfully"));
  }

  const like = await Like.create({
    tweet: tweetId,
    likedBy: req.user._id,
  });
  if (!like) {
    throw new ApiError(500, "Something went wrong while liking the tweet");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, like, "Tweet has been liked succesfully"));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos

  const likedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $lookup: {
        from: "videos",
        foreignField: "_id",
        localField: "video",
        as: "videoDetails",
      },
    },
    {
      $unwind: {
        path: "$videoDetails",
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $addFields: {
        "videoDetails.likedAt": "$createdAt",
        "videoDetails.likeId": "$_id",
      },
    },
    {
      $replaceRoot: {
        newRoot: "$videoDetails",
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
