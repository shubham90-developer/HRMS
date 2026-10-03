import mongoose from "mongoose";

const DBConnection = async (): Promise<void> => {

    try {

        const MongoURI = process.env.MONGODB_URI;

        if (!MongoURI) {
            throw new Error("⚠ MongoDB URL is not defined!");
        }

        await mongoose.connect(MongoURI);

        console.log("Connected ✅")

    } catch (error) {

        console.error("MongoDB connection failed:", error);
        process.exit(1);
    }
}

export default DBConnection;