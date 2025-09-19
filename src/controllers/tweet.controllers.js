import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  //TODO: create tweet

  const { content } = req.body;

  if ([content]?.some((field) => field.trim() === "")) {
    return new ApiError(400, "content filed is required");
  }

  const tweet = await Tweet.create({
    content,
    owner: req.user._id,
  });

  const createdTweet = await Tweet.findById(tweet._id);

  if (!createdTweet) {
    throw new ApiError(500, "Error in creating tweet");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "tweet created succesfully", createdTweet));
});

const getUserTweets = asyncHandler(async (req, res) => {
  // TODO: get user tweets
  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user id");
  }

  const userTweets = await Tweet.find({ owner: userId })
    .sort({ createdAt: -1 }) // Fetch user tweets sorted by newest first
    .lean();

  if (userTweets.length === 0) {
    return res.status(200).json(new ApiResponse(200, [], "No tweets found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, userTweets, "user tweets fetched succesfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
  //TODO: update tweet
  const { tweetId } = req.params;
  const { content } = req.body;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Inavlaid user id");
  }

  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  if (tweet.owner !== req.user._id) {
    throw new ApiError(403, "Unauthorized request");
  }

  if (content.trim() === "") {
    throw new ApiError(400, "content is required");
  }

  const updatedTweet = await Tweet.findByIdAndUpdate(
    tweet._id,
    {
      $set: {
        content,
      },
    },
    {
      new: true,
    }
  );

  if (!updatedTweet) {
    throw new ApiError(500, "something went wrong while updating tweet");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedTweet, "tweet updated successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  //TODO: delete tweet

  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Inavalid tweet id");
  }

  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  if (tweet.owner !== req.user._id) {
    throw new ApiError(401, "Unauthorized request");
  }

  await Tweet.findByIdAndDelete(tweet._id);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "tweet deleted successfully"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
