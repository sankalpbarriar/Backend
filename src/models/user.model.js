import mongoose, { Schema, model } from "mongoose";

const userSchema = new Schema(
    {
        username:{
            type:String,
            required:true,
            unique:true,
            lowercase:true,
            trim:true,
            index:true
        }
    }
);

export const user = mongoose.model("User", userSchema);
