import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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

  const { fullName, email, username, password } = req.body;  //req.body ke andar apna data aa raha hai
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
  const avatarLocalPath = req.files?.avatar[0]?.path;     //abhi ye server pe hai clodinary pe nahi gaya hai
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
       coverImageLocalPath=req.files.coverImage[0]?.path;
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

export { registerUser };

