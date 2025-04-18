import express, { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import UserModel from "../models/User";
import Schedule from "../models/Schedule";
import Subject from "../models/Subject";
import Room from "../models/Room";
import Section from "../models/Section";
import dotenv from "dotenv";
import multer from "multer";
import mammoth from "mammoth";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";



dotenv.config();
const router = express.Router();
const upload = multer({ dest: "uploads/" });

// LOGIN ROUTE
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    const user = await UserModel.findOne({ username });
    if (!user) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        role: user.role,
        first_name: user.first_name,
        middle_name: user.middle_name,
        last_name: user.last_name,
        status: user.status,
      },
      requiresUpdate: user.status === "temporary",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET FACULTY LIST
router.get("/faculty", async (req: Request, res: Response): Promise<void> => {
  try {
    const facultyList = await UserModel.find().select("first_name middle_name last_name username email role status");
    res.json(facultyList);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE FACULTY ACCOUNT
router.delete("/faculty/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const faculty = await UserModel.findById(id);
    if (!faculty) {
      res.status(404).json({ message: "UserModel not found" });
      return;
    }

    await UserModel.findByIdAndDelete(id);
    res.json({ message: "UserModel account deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// CREATE NEW FACULTY ACCOUNT
router.post("/faculty", async (req: Request, res: Response): Promise<void> => {
  console.log(req.body);
  try {
    const { last_name, first_name, middle_name, email, username, password, role } = req.body;

    if (!last_name || !first_name || !username || !email || !password || !role) {
      res.status(400).json({ message: "Please provide all required fields, including role" });
      return;
    }

    const validRoles = ["superadmin", "instructor", "programchairperson", "dean"];
    if (!validRoles.includes(role)) {
      res.status(400).json({ message: "Invalid role." });
      return;
    }

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: "Email already exists" });
      return;
    }

    const existingUserUsername = await UserModel.findOne({ username });
    if (existingUserUsername) {
      res.status(400).json({ message: "Username already exists" });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new UserModel({
      last_name,
      first_name,
      middle_name: middle_name || "",
      username,
      email,
      password: hashedPassword,
      role,
      status: "temporary",
    });

    await newUser.save();

    res.status(201).json({
      _id: newUser._id,
      last_name: newUser.last_name,
      first_name: newUser.first_name,
      middle_name: newUser.middle_name,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      status: newUser.status,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/instructors", async (req: Request, res: Response): Promise<void> => {
  try {
    const instructors = await UserModel.find({ role: "faculty" }).select("first_name middle_name last_name");
    res.json(instructors);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching instructors" });
  }
});

// GET SCHEDULES ROUTE
router.get("/schedules", async (req: Request, res: Response): Promise<void> => {
  try {
    const schedules = await Schedule.find().populate("instructor");
    res.json(schedules);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching schedules", error });
  }
});

// ADD NEW SCHEDULE ROUTE
router.post("/schedules", async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      courseTitle,
      courseCode,
      instructor,
      room,
      startTime,
      endTime,
      days,
      semesterStartDate,
      semesterEndDate,
      section,
    } = req.body;

    if (
      !courseTitle ||
      !courseCode ||
      !instructor ||
      !room ||
      !startTime ||
      !endTime ||
      !days ||
      !semesterStartDate ||
      !semesterEndDate ||
      !section 
    ) {
      res.status(400).json({ message: "Please provide all required fields including semester dates and days." });
      return;
    }

    const validDays = ["mon", "tue", "wed", "thu", "fri", "sat"];
    const isValidDays = validDays.every(day => typeof days[day] === "boolean");

    if (!isValidDays) {
      res.status(400).json({ message: "Invalid days format." });
      return;
    }

    const newSchedule = new Schedule({
      courseTitle,
      courseCode,
      instructor,
      room,
      startTime,
      endTime,
      days,
      semesterStartDate,
      semesterEndDate,
      section,
    });

    await newSchedule.save();

    res.status(201).json({
      message: "Schedule created successfully.",
      schedule: newSchedule,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});



// GET SUBJECTS LIST
router.get("/subjects", async (req: Request, res: Response): Promise<void> => {
  try {
    const subjects = await Subject.find().select("courseCode courseTitle");
    res.json(subjects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching subjects" });
  }
});

// GET ROOMS LIST
router.get("/rooms", async (req: Request, res: Response): Promise<void> => {
  try {
    const rooms = await Room.find().select("name");
    res.json(rooms);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching rooms" });
  }
});

// GET SECTIONS LIST
router.get("/sections", async (req: Request, res: Response): Promise<void> => {
  try {
    const sections = await Section.find().select("course section block");
    res.json(sections);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching sections" });
  }
});

interface ScheduleInput {
  courseCode: string;
  courseTitle: string;
  section: mongoose.Types.ObjectId;
  instructor: mongoose.Types.ObjectId;
  room: string;
  startTime: string;
  endTime: string;
  semesterStartDate: string;
  semesterEndDate: string;
  days: {
    mon: boolean;
    tue: boolean;
    wed: boolean;
    thu: boolean;
    fri: boolean;
    sat: boolean;
  };
  displaySection?: string;
}


// PARSE AND UPLOAD TEACHING LOAD DOCUMENT
router.post("/uploadScheduleDocument", upload.single("scheduleDocument"), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      console.log("❌ No file uploaded.");
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    const filePath = req.file.path;
    console.log("📄 Uploaded file path:", filePath);

    const result = await mammoth.extractRawText({ path: filePath });
    const text = result.value;
    console.log("📄 Extracted text (first 500 chars):", text.slice(0, 500));

    fs.unlink(filePath, () => {
      console.log("🧹 Temp file cleaned up.");
    });

    const semAyMatch = text.match(/(\d(?:ST|ND|RD|TH))\s+Semester,\s*AY\s*(\d{4})-(\d{4})/i);
    let semester = "TBD";
    let semesterStartDate = "TBD";
    let semesterEndDate = "TBD";

    if (semAyMatch) {
      semester = semAyMatch[1].toUpperCase();
      const startYear = parseInt(semAyMatch[2], 10);
      const endYear = parseInt(semAyMatch[3], 10);

      if (semester === "1ST") {
        semesterStartDate = `${startYear}-08-01`;
        semesterEndDate = `${startYear}-12-15`;
      } else if (semester === "2ND") {
        semesterStartDate = `${endYear}-01-10`;
        semesterEndDate = `${endYear}-05-30`;
      }

      console.log(`🗓 Parsed semester: ${semester}, AY: ${startYear}-${endYear}`);
      console.log(`🗓 Semester dates: ${semesterStartDate} to ${semesterEndDate}`);
    } else {
      console.warn("⚠️ Semester and AY not found, using default dates.");
    }

    const instructorNameMatch = text.match(/Name of Instructor:\s*(.*)/i);
    const instructorFullName = instructorNameMatch ? instructorNameMatch[1].trim().toUpperCase() : "";
    console.log("👨‍🏫 Parsed instructor name:", instructorFullName);

    const instructor = await UserModel.findOne({
      $expr: {
        $regexMatch: {
          input: { $concat: ["$first_name", " ", "$middle_name", " ", "$last_name"] },
          regex: instructorFullName.replace(/\s+/g, ".*"),
          options: "i"
        }
      }
    });

    if (!instructor) {
      console.log("❌ Instructor not found in DB.");
      res.status(404).json({ message: "Instructor not found in database" });
      return;
    }

    console.log("✅ Instructor found:", `${instructor.first_name} ${instructor.middle_name} ${instructor.last_name}`);

    const lines = text.split("\n").map(line => line.trim()).filter(Boolean);
    console.log("🔍 Total extracted lines:", lines.length);

    let currentCourseCode = "";
    let currentCourseTitle = "";
    let currentSection = "";
    const schedules: ScheduleInput[] = [];

    const getDaysObj = (dayStr: string) => ({
      mon: /M/.test(dayStr),
      tue: /T(?!h)/.test(dayStr),
      wed: /W/.test(dayStr),
      thu: /Th|H/.test(dayStr),
      fri: /F/.test(dayStr),
      sat: /S/.test(dayStr),
    });

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const courseCodeMatch = line.match(/^(IS|IT)\s*\d{3}/);
      if (courseCodeMatch) {
        currentCourseCode = courseCodeMatch[0];
        const courseLine = lines[i + 1] || "";
        currentCourseTitle = lines[i + 1]?.split("(")[0]?.trim() || "";
        console.log("📘 Found course:", currentCourseCode, "-", currentCourseTitle);

        const sectionMatch = courseLine.match(/\(([^)]+)\)/);
        currentSection = sectionMatch ? sectionMatch[1].trim() : "Unknown";

        console.log("📘 Found course:", currentCourseCode, "-", currentCourseTitle, "| Section:", currentSection);
        continue;
      }

      const timeMatch = line.match(/(\d{2}:\d{2})\s*–\s*(\d{2}:\d{2})\s*\((lec|lab)\)/i);
      if (timeMatch) {
        const [ , startTime, endTime, type ] = timeMatch;
        const dayStr = lines[i + 1] || "";
        const days = getDaysObj(dayStr);

        const [courseCodePart, sectionBlock] = currentSection.split(" ");
        const sectionLevel = sectionBlock?.[0];
        const blockLetter = sectionBlock?.[1];

        const sectionDoc = await Section.findOne({
          course: new RegExp(courseCodePart, "i"),
          section: sectionLevel,
          block: blockLetter,
        });

        if (!sectionDoc) {
          console.warn(`⚠️ Section not found: ${currentSection}`);
          continue;
        }

        schedules.push({
          courseCode: currentCourseCode,
          courseTitle: currentCourseTitle,
          section: sectionDoc._id as mongoose.Types.ObjectId,
          instructor: instructor._id,
          room: "TBD",
          startTime,
          endTime,
          semesterStartDate,
          semesterEndDate,
          days,
          displaySection: `${sectionDoc.course} ${sectionDoc.section}${sectionDoc.block}`,
        });

        console.log(`🗓 Added ${type} for ${currentCourseCode}: ${startTime}–${endTime} on ${dayStr}`);
      }
    }

    console.log("📤 Parsed schedules ready to return:", JSON.stringify(schedules, null, 2));

    res.status(200).json({
      message: "Preview parsed data",
      data: schedules,
      instructorName: `${instructor.last_name}, ${instructor.first_name} ${instructor.middle_name} `,
      academicYear: `${semAyMatch?.[2]}-${semAyMatch?.[3]}`,
      semester: semester,
    });

  } catch (error) {
    console.error("🔥 Error while processing document:", error);
    res.status(500).json({ message: "Failed to process document", error });
  }
});


router.post("/confirmSchedules", async (req: Request, res: Response): Promise<void> => {
  try {
    const schedules = req.body.schedules;
    const saved = await Schedule.insertMany(schedules);
    res.status(201).json({ message: "Schedules saved successfully", data: saved });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to save schedules" });
  }
});


export default router;
