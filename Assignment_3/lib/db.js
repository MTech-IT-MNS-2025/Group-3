import mongoose from "mongoose";

const offlineUri = process.env.MONGO_URI; // organization server LAN IP
const onlineUri = process.env.MONGO_URI; // MongoDB Atlas URI

const uri = process.env.USE_ONLINE_DB === "true" ? onlineUri : offlineUri;

mongoose.connect(uri)
  .then(() => console.log(`Connected to ${process.env.USE_ONLINE_DB === "true" ? "Online" : "Offline"} MongoDB`))
  .catch(err => console.error("MongoDB connection error:", err));

export default mongoose;


