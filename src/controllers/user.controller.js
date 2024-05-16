import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId); //finding user ont the basis of id
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    //putting in db also
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token."
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // ALGORITHM TO REGISTER USER
  //get user details from frontend
  //validation-not empty
  //check if user exists: username,email
  //check for images, check for avatar
  //upload them to cloudinary, check weather avatar is uploaded successfully
  //create user object-create entry in db
  //remove password and refresh token field from response
  //check for user creation
  //return response if not return error message

  const { fullName, email, username, password } = req.body; //req.body ke andar apna data aa raha hai
  // console.log("email", email);

  //CHECKS --> saare fields ko ek baar me hi check kar liya using array and giving Api Error message
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required.");
  }

  //CHECK--> wheather user exists in prior and returning proper Error message
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "user with this email already exists");
  }

  //taking avatar path from multer
  // console.log("reg.files ",req.files)
  const avatarLocalPath = req.files?.avatar[0]?.path; //abhi ye server pe hai clodinary pe nahi gaya hai
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0]?.path;
  }

  //avatar file to rehna hi chaiye
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  //now upload on cloudinart
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  //again check whether avatar is uploaded or not as it is the required file
  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  //creating user
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "", //kui ki hamne coverImage ka check nahi lagaya hai isliye agar nahi hai to empty pass kar do
    email,
    password,
    username: username.toLowerCase(),
  });

  //checking whether user is created and removing password
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken" //ye do field select hoke nahi aayenge
  );
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  //Returning response
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registerd successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // req.body  --> data
  // username or email
  // find the user
  // password check
  // access and refresh token to generate and send to user
  //send cookies
  const { email, username, password } = req.body;
  console.log(email);

  if (!username && !email) {
    throw new ApiError(400, "username or email is required");
  }

  //finding user with the given email
  const user = await User.findOne({
    $or: [{ username }, { email }], //ya to email se find kar do ya fir username se
  });

  //agar user mila hi nahi
  if (!user) {
    throw new ApiError(404, "user does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password); //since we are using our own created method hence it will be called using 'user' not 'User' ('User' is from mongoose)
  if (!isPasswordValid) {
    throw new ApiError(401, "invalid user credentials");
  }

  //if password is also correct then create access and refresh token
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "_password _refreshToken"
  );

  //sending cookies

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "user logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshAccessToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "INvalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken)
      .cookie("refreshToken", refreshToken)
      .json(
        new ApiResponse(
          200,
          { accessToken, newRefreshToken },
          "Acess token refreshed"
        )
      );
  } catch (e) {
    throw new ApiError(401, e?.message || "invalid refresh token");
  }
});

const changeCurrentPassrod = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) throw new ApiError(400, "Incorrect password");

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password updated successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(200, req.user, "current user fetched successfully");
});

const updateAccountdetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email: email,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;  //first storing in our local
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath); //uploading on cloudinary
  if (!avatar) throw new ApiError(400, "Error while uploading avatar");

  //TODO: delete old image  
  
  //updation logic
  const user=await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
  .status(200)
  .json(new ApiResponse(200,"avatar image updated successfully"))


});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;  //first storing in our local
  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover Image is missing");
  }
  const coverImage = await uploadOnCloudinary(coverImageLocalPath); //uploading on cloudinary
  if (!coverImage) throw new ApiError(400, "Error while uploading cover image");
  //updation logic
  const user=await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");
  return res
  .status(200)
  .json(new ApiResponse(200,"cover image updated successfully"))
});


export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassrod,
  getCurrentUser,
  updateAccountdetails,
  updateUserAvatar,
  updateUserCoverImage,
};
