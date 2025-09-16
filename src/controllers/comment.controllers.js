import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!isValidObjectId(videoId)) {
    throw new ApiError("invalid video id");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(400, "Invalid videp id");
  }

  const pipeline = [
    {
      $match: {
        video: new mongoose.Types.ObjectId(video._id),
      },
    },
  ];

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    customLabels: { docs: "comments" },
  };

  const videoComments = await Comment.aggregatePaginate(
    Comment.aggregate(pipeline),
    options
  );

  if (!videoComments || videoComments.comments.length === 0) {
    throw new ApiError(404, "error while fetching comments");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        videoComments,
        "commments of video has been fetched succesfully"
      )
    );
});

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
  const { videoId } = req.params;

  const { content } = req.body;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (content?.trim() === "") {
    throw new ApiError(400, "content field is required");
  }

  const comment = await Comment.create({
    content,
    owner: req.user._id,
    video: video._id,
  });

  if (!comment) {
    throw new ApiError(500, "something went wrong while commenting");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, comment, "comment has been succesfully created")
    );
});

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment
  const { commentId } = req.params;
  const { content } = req.body;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Inavalid comment id");
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "comment not found");
  }

  // (!comment.owner.equals(req.user._id))  built in mongoose method to check id since objectId in mongoose is Object.
  if (req.user._id.toString() !== comment.owner.toString()) {
    throw new ApiError(401, "unauthorized request");
  }

  if (content?.trim() === "") {
    throw new ApiError(400, "content field is missing");
  }

  const updatedComment = await Comment.findByIdAndUpdate(
    comment._id,
    {
      $set: {
        content: content.trim(),
      },
    },
    { new: true }
  );

  if (!updatedComment) {
    throw new ApiError(500, "something went wrong while updating comment");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedComment, "comment has been updated"));
});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
  const { commentId } = req.params;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "invalid comment id");
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "comment not found");
  }

  if (!comment.owner.equals(req.user._id)) {
    throw new ApiError(401, "unauthorized request");
  }

  const deletedComment = await Comment.findByIdAndDelete(commentId);
  if (!deletedComment) {
    throw new ApiError(500, "Error deleting the comment");
  }

  return res.status(200).json(new ApiResponse(200, "comment has been deleted"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
