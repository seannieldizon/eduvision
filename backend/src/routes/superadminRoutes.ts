import express, { Request, Response } from 'express';
import UserModel from '../models/User';
import College from "../models/College";
import Course from "../models/Course";



const router = express.Router();

router.get("/dean", async (req: Request, res: Response): Promise<void> => {
  try {
    const deanList = await UserModel.find({ role: "dean" })
      .select("first_name middle_name last_name ext_name username email college status")
      .populate("college", "code name");

    res.json(deanList);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/programchairinfo-only", async (req: Request, res: Response): Promise<void> => {
  try {
    const deanList = await UserModel.find({ role: "programchairperson" })
      .populate("college", "code name");

    res.json(deanList);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/instructorinfo-only", async (req: Request, res: Response): Promise<void> => {
  try {
    const instructorList = await UserModel.find({ role: "instructor" })
      .populate("college", "code name")
      .populate("course", "code");

    // Transform the response to strip out course._id
    const transformed = instructorList.map((instructor) => {
  const instructorObj = instructor.toObject();
  return {
    ...instructorObj,
    course: (instructorObj.course as any)?.code || null, // cast to any
  };
});


    res.json(transformed);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});



router.get('/all-colleges', async (req, res) => {
  try {
    const colleges = await College.find();
    res.status(200).json(colleges);
  } catch (error) {
    console.error('Error fetching colleges:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/courses/by-college', async (req: Request, res: Response): Promise<void> => {
  const { collegeCode } = req.query;

  try {
    // Step 1: Find the college _id by code
    const college = await College.findOne({ code: collegeCode });

    if (!college) {
      res.status(404).json({ error: 'College not found' });
      return;  // <-- return here to stop execution and assure TS college is not null later
    }

    // Step 2: Find courses with college ObjectId
    const courses = await Course.find({ college: college._id }).select('name code -_id');

    // Return course list
    res.json(courses);
  } catch (error) {
    console.error('Error fetching courses by college:', error);
    res.status(500).json({ error: 'Server error fetching courses' });
  }
});

// GET total count of users by role
router.get("/user-counts", async (req: Request, res: Response): Promise<void> => {
  try {
    const [deanCount, programChairCount, instructorCount, superadminCount] = await Promise.all([
      UserModel.countDocuments({ role: "dean" }),
      UserModel.countDocuments({ role: "programchairperson" }),
      UserModel.countDocuments({ role: "instructor" }),
      UserModel.countDocuments({ role: "superadmin" }),
    ]);

    res.json({
      dean: deanCount,
      programChairperson: programChairCount,
      instructor: instructorCount,
      superadmin: superadminCount,
    });
  } catch (error) {
    console.error("Error counting users by role:", error);
    res.status(500).json({ message: "Server error counting users" });
  }
});


export default router;
