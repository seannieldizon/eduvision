import express, { Request, Response } from "express";
import UserModel from "../models/User";
import "../models/User";
import College from "../models/College";
import Room from "../models/Room";
import Course from "../models/Course";
import Schedule from "../models/Schedule";

const router = express.Router();

router.post(
  "/college-courses",
  async (req: Request, res: Response): Promise<void> => {
    const { collegeCode } = req.body;

    if (!collegeCode) {
      res.status(400).json({ message: "collegeCode is required." });
      return; // exit early
    }

    try {
      const college = await College.findOne({ code: collegeCode });

      if (!college) {
        res.status(404).json({ message: "College not found." });
        return; // exit early
      }

      const courses = await Course.find({ college: college._id });

      res.status(200).json({
        collegeId: college._id,
        courses,
      });
    } catch (error) {
      console.error("Error fetching college and courses:", error);
      res.status(500).json({ message: "Server error." });
    }
  }
);

// ✅ GET sections filtered by CollegeName (code), with populated college info
router.get(
  "/all-courses/college",
  async (req: Request, res: Response): Promise<void> => {
    const { CollegeName } = req.query;

    try {
      const college = await College.findOne({ code: CollegeName });

      if (!college) {
        res.status(404).json({ error: "College not found" });
        return;
      }
      const course = await Course.find({ college: college._id })
        .populate("college", "code name") // populate college code and name only
        .lean();

      res.json(course);
    } catch (error) {
      console.error("Error fetching sections:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// ✅ GET rooms filtered by CollegeName (code), with populated college info
router.get(
  "/all-rooms/college",
  async (req: Request, res: Response): Promise<void> => {
    const { CollegeName } = req.query;

    try {
      const college = await College.findOne({ code: CollegeName });

      if (!college) {
        res.status(404).json({ error: "College not found" });
        return;
      }
      const course = await Room.find({ college: college._id })
        .populate("name", "location") // populate college code and name only
        .lean();

      res.json(course);
    } catch (error) {
      console.error("Error fetching sections:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// FETCH ALL FULL SCHEDULES TODAY BASED ON COURSE
router.post(
  "/dean/all-schedules/today",
  async (req: Request, res: Response): Promise<void> => {
    const { shortCourseValue } = req.body;

    if (!shortCourseValue) {
      res.status(400).json({ message: "shortCourseName is missing" });
      return;
    }

    try {
      const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
      const today = dayNames[new Date().getDay()];

      const schedules = await Schedule.find({
        courseCode: { $regex: `^${shortCourseValue}`, $options: "i" },
        [`days.${today}`]: true,
      })
        .populate("instructor", "first_name last_name")
        .populate("section", "course section block")
        .lean();

      res.status(200).json(schedules);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      res.status(500).json({ message: "Error fetching schedules" });
    }
  }
);

// GET Program Chairpersons based on College Code from query
router.get(
  "/programchairs",
  async (req: Request, res: Response): Promise<void> => {
    const { collegeCode } = req.query;

    if (!collegeCode) {
      res.status(400).json({ message: "collegeCode is missing" });
      return;
    }

    try {
      const programChairs = await UserModel.find({
        role: { $in: ["programchairperson", "instructor"] },
      })
        .populate({
          path: "college",
          select: "code",
          match: { code: collegeCode as string },
        })
        .populate({
          path: "course",
          select: "code",
        })
        .select(
          "first_name middle_name last_name username email role status course college"
        )
        .exec();

      const filteredChairs = programChairs
        .filter((user) => user.college)
        .map((user) => ({
          ...user.toObject(),
          course: (user.course as any)?.code || null, // safely get course code
        }));

      res.json(filteredChairs);
    } catch (error) {
      console.error("Error fetching program chairpersons:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

//Count of Faculty and Program Chairperson
router.get(
  "/count-all/instructors",
  async (req: Request, res: Response): Promise<void> => {
    const { CollegeName } = req.query;

    try {
      const college = await College.findOne({ code: CollegeName });

      if (!college) {
        res.status(404).json({ error: "College not found" });
        return;
      }

      const instructorCount = await UserModel.countDocuments({
        role: "instructor",
        college: college._id,
      });

      const programChairCount = await UserModel.countDocuments({
        role: "programchairperson",
        college: college._id,
      });

      res.json({
        instructorCount,
        programChairCount,
      });
    } catch (error) {
      console.error("Error fetching counts:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

export default router;
