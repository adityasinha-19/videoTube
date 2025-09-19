import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  // TODO: toggle subscription

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel id");
  }

  const channel = await User.findById(channelId);
  if (!channel) {
    throw new ApiError(404, "Channel not found");
  }

  // check if user is already subscribed to this channel
  const alreadySubscribed = await Subscription.findOneAndDelete({
    subscriber: req.user._id,
    channel: channelId,
  });

  // unsubscribe the channel
  if (alreadySubscribed) {
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Channel Unsubscribed successfully "));
  }

  // create new subscription
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

/* // Advanced pipeline method to toggle subscription
const toggleSubscription = asyncHandler(async (req, res) => {
  const channelId = req.params;
  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel id");
  }

  // check if channel exist
  const channel = await User.findById(channelId);
  if (!channel) {
    throw new ApiError(404, "Channel not found");
  }

  // toggle subscription using single DB querie
  const result = await Subscription.collection.findOneAndUpdate(
    { subscriber: req.user._id, channel: channelId },
    [
      {
        $set: {
          toDelete: { $cond: [{ $gt: ["subscriber", null] }, true, false] },
        },
      },
    ],
    {
      returnDocument: "after",
      upsert: true, //  reates the document if does not exist
    }
  );

  if (result.value?.toDelete) {
    await Subscription.deleteOne({ _id: result.value._id });
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Channel unsubscribed successfully"));
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, result.value, "Channel subscribed successfully")
    );
});
*/

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Inavalid channel id");
  }

  const channel = await User.findById(channelId);
  if (!channel) {
    throw new ApiError(404, "Channel not found");
  }

  const channelSubscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "subscriber",
        as: "subscriberDetails",
      },
    },
    //flatten the array so each subscriber is a single object
    {
      $unwind: "$subscriberDetails",
    },
    {
      $project: {
        _id: 0,
        subscriber: "$subscriberDetails",
      },
    },
  ]);

  if (channelSubscribers.length === 0) {
    return res
      .status(200)
      .json(new ApiResponse(200, [], "No subscriber found"));
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      channelSubscribers.map((s) => s.subscriber),
      "Channel subscribers list fetched successfully"
    )
  );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  if (!isValidObjectId(subscriberId)) {
    throw new ApiError(400, "Invalid subscriber id");
  }

  if (req.user._id.toString() !== subscriberId.toString()) {
    throw new ApiError(403, "you are forbiddeb to view thi data");
  }

  const channelsSubscribed = await Subscription.aggregate([
    {
      $match: { subscriber: new mongoose.Types.ObjectId(subscriberId) },
    },
    {
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "channel",
        as: "channelDetails",
      },
    },
    // flatten the array so each channel is a single object
    {
      $unwind: "$channelDetails",
    },
    // only return channelDetails, hide subscriber field
    {
      $project: {
        _id: 0,
        channel: "$channelDetails",
      },
    },
  ]);

  if (channelsSubscribed.length === 0) {
    return res
      .status(200)
      .json(new ApiResponse(200, [], "No subscriptions found"));
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      channelsSubscribed.map((c) => c.channel),
      "Subscribed channel list fetched succesfully"
    )
  );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
