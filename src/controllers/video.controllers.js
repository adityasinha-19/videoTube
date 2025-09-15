import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    query,
    sortBy = "createdAt",
    sortType = "desc",
    userId,
  } = req.query;
  //TODO: get all videos based on query, sort, pagination

  // build match stage
  let match = {};

  // single field search
  /*
  if (query) {
    match.title = {
      $regex: query,
      $options: "i",
    };
  }
    */

  // multi-field search: title & description
  if (query) {
    const regexQuery = { $regex: query, $options: "i" };
    match.$or = [{ title: regexQuery }, { description: regexQuery }];
  }

  // if a valid userId is provided then filter only videos uploaded by that user
  if (userId && isValidObjectId(userId)) {
    match.owner = userId;
  }

  // convert sorting order
  const sortOrder = sortType === "asc" ? 1 : -1;

  // build MOngoDB aggregation pipeline
  // stage 1: $match -> filters videos based on search(query)/userId conditions
  // stage 2: $sort -> sorts the matched videos by the given field and order
  const pipeline = [{ $match: match }, { $sort: { [sortBy]: sortOrder } }];

  // Pagination options for aggregatePaginate plugin
  // convert page and limit string to Number
  // page -> current page number
  // limit -> number of documents per page
  // customLabels -> rename "docs" field to "videos" in response
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    customLabels: { docs: "videos" },
  };

  // execute the aggregation pipeline with pagination
  // Video.aggregate(pipeline) -> runs the pipeline
  // aggregatePaginate => automatically handles pagination for aggregation results
  const videos = await Video.aggregatePaginate(
    Video.aggregate(pipeline),
    options
  );

  if (!videos || videos.videos.length === 0) {
    throw new ApiError(404, "No videos found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "videos fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  // TODO: get video, upload to cloudinary, create video

  if ([title, description].some((field) => field.trim() === "")) {
    throw new ApiError(400, "all fields are required");
  }

  const videoLocalPath = req.files?.videoFile[0]?.path;
  if (!videoLocalPath) {
    throw new ApiError(404, "Video is required");
  }
  const thumbnailLocaPath = req.files?.thumbnail[0]?.path;
  if (!thumbnailLocaPath) {
    throw new ApiError(404, "thumbnail is required");
  }

  const video = await uploadOnCloudinary(videoLocalPath);

  if (!video) {
    throw new ApiError(500, "something went wrong");
  }

  const thumbnail = await uploadOnCloudinary(thumbnailLocaPath);

  if (!thumbnail) {
    throw new ApiError(500, "something went wrong");
  }

  const publishedVideo = await Video.create({
    videoFile: video.url,
    thumbnail: thumbnail.url,
    title,
    description,
    duration: video.duration,
    isPublished: true,
    owner: req.user?._id,
  });

  const createdVideo = await Video.findById(publishedVideo._id);

  if (!createdVideo) {
    throw new ApiError(500, "Error while uploading video");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, createdVideo, "Video has been published succesfully")
    );
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);

  if (video.owner !== req.user._id) {
    throw new ApiError(401, "unauthorized request");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "video fetched succesfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail
  const { title, description } = req.body;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Inavalid video id");
  }

  if ([title, description].some((field) => field.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  const video = await Video.findById(videoId);

  if (video.owner !== req.user._id) {
    throw new ApiError(401, "Unauthorized request");
  }

  const oldVideoThumbnail = video.thumbnail;

  const thumbnailLocalPath = req.file?.path;

  if (!thumbnailLocalPath) {
    throw new ApiError(400, "thumbnail is required");
  }

  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  const updatedVideo = await Video.findByIdAndUpdate(
    video._id,
    {
      $set: {
        title,
        description,
        thumbnail: thumbnail.url,
      },
    },
    {
      new: true,
    }
  );

  if (!updatedVideo) {
    throw new ApiError(500, "Error while updating video");
  }

  await deleteFromCloudinary(oldVideoThumbnail);

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedVideo, "video has been updated succesfully")
    );
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);

  if (video.owner !== req.user._id) {
    throw new ApiError(401, "Unauthorized request");
  }

  const oldVideoUrl = video.videoFile;
  const oldVideoThumbnail = video.thumbnail;

  await Video.findByIdAndDelete(video._id);

  await deleteFromCloudinary(oldVideoUrl);
  await deleteFromCloudinary(oldVideoThumbnail);

  return res
    .status(200)
    .json(new ApiResponse(200, "video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);

  if (video.owner !== req.user._id) {
    throw new ApiError(401, "unauthorized request");
  }

  await Video.findByIdAndUpdate(
    video._id,
    {
      $set: {
        isPublished: false,
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "video publish status toggled succesfully"));
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
