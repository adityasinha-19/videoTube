import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  // TODO: toggle subscription

  if (!isValidObjectId(channelId.trim())) {
    throw new ApiError(400, "channel id is required");
  }

  const channel = await User.findById(channelId);

  const subscription = await Subscription.create({
    subscriber: req.user._id,
    channel: channel._id,
  });

  if (!subscription) {
    throw new ApiError(500, "Error while subscribing the channel");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, subscription, "channel subscribed successfully")
    );
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!isValidObjectId(channelId.trim())) {
    throw new ApiError(400, "Inavalid channel id");
  }

  const channel = await User.findById(channelId);

  const channelSubscribers = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(channel._id),
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
      $addFields: {
        $first: "$subscribers.subscriber",
      },
    },
  ]);

  if (!channelSubscribers) {
    throw new ApiError(500, "Error while fetching subscribers list");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        channelSubscribers[0],
        "Channel subscribers list fetched successfully"
      )
    );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  if (!isValidObjectId(subscriberId.trim())) {
    throw new ApiError(400, "Invalid subscriber id");
  }

  const subscriber = await User.findById(subscriberId);

  const channelsSubscribed = User.aggregate([
    {
      $match: {
        _id: subscriber._id,
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "channelSubscribed",
      },
    },
    {
      $addFields: {
        $first: "$channelSubscribed.channel",
      },
    },
  ]);

  if (!channelsSubscribed) {
    throw new ApiError(500, "Error while fetching channels list");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        channelsSubscribed[0],
        "Subscribed channel list fetched succesfully"
      )
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
