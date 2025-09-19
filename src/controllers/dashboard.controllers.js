import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.

  const channelDetails = await User.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(req.user._id) },
    },
    {
      $lookup: {
        from: "videos",
        foreignField: "owner",
        localField: "_id",
        as: "allVideos",
        pipeline: [
          {
            $lookup: {
              from: "likes",
              foreignField: "video",
              localField: "_id",
              as: "likes",
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        foreignField: "subscriber",
        localField: "_id",
        as: "subscribers",
      },
    },
    {
      $addFields: {
        totalVideos: { $size: "$allVideos" },
        totalViews: {
          $sum: {
            $map: {
              input: "$allVideos",
              as: "video",
              in: { $ifNull: ["$$video.views", 0] },
            },
          },
        },
        totalLikes: {
          $sum: {
            $map: {
              input: "$allVideos",
              as: "video",
              in: { $size: { $ifNull: ["$$video.likes", []] } },
            },
          },
        },
        totalSubscribers: { $size: "$subscribers" },
      },
    },
    {
      $project: {
        allVideos: 0,
        subscribers: 0,
        password: 0,
        email: 0,
      },
    },
  ]);

  if (channelDetails.length === 0) {
    throw new ApiError(404, "Channel not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, channelDetails[0], "channel stats fetched"));
});

const getChannelVideos = asyncHandler(async (req, res) => {
  // TODO: Get all the videos uploaded by the channel
  const videos = await Video.find({
    owner: req.user._id,
  });

  if (!videos) {
    throw new ApiError(400, "Videos not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "channel videos fetched succesfully"));
});

export { getChannelStats, getChannelVideos };
