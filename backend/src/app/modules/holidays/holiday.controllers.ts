import { Request, Response } from "express";
import { Types } from "mongoose";
import { Holiday } from "./holiday.model";
import {
  createHolidaySchema,
  updateHolidaySchema,
} from "./holiday.validation";

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getPagination = (
  query: Request["query"],
  defaultLimit = 50,
  maxLimit = 200
) => {
  const page = Math.max(
    parseInt(String(query.page ?? "1"), 10) || 1,
    1
  );

  const limit = Math.min(
    Math.max(
      parseInt(String(query.limit ?? defaultLimit), 10) ||
        defaultLimit,
      1
    ),
    maxLimit
  );

  return { page, limit, skip: (page - 1) * limit };
};

const startOfTodayUtc = (): Date => {
  const now = new Date();

  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    )
  );
};

const locationFilter = (location: string) => [
  { isAllLocations: true },
  {
    locations: {
      $regex: new RegExp(`^${escapeRegex(location)}$`, "i"),
    },
  },
];

const findDuplicate = (
  name: string,
  date: Date,
  excludeId?: string
) => {
  const filter: Record<string, unknown> = {
    isDeleted: false,
    date,
    name,
  };

  if (excludeId) {
    filter._id = { $ne: excludeId };
  }

  // strength 2 = case-insensitive comparison
  return Holiday.findOne(filter).collation({
    locale: "en",
    strength: 2,
  });
};

export const createHoliday = async (
  req: Request,
  res: Response
) => {
  try {
    const result = createHolidaySchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: result.error.flatten(),
      });
    }

    const data = result.data;

    const duplicate = await findDuplicate(data.name, data.date);

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message:
          "A holiday with the same name already exists on this date",
      });
    }

    const holiday = await Holiday.create({
      ...data,
      createdBy: new Types.ObjectId(req.user!.id),
    });

    return res.status(201).json({
      success: true,
      message: "Holiday created successfully",
      data: holiday,
    });
  } catch (error) {
    console.error("Create holiday error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create holiday",
    });
  }
};

export const getHolidays = async (
  req: Request,
  res: Response
) => {
  try {
    const { year, month, type, location, search } = req.query;

    const filter: Record<string, any> = { isDeleted: false };

    if (year !== undefined || month !== undefined) {
      const yearNumber =
        year !== undefined
          ? Number(year)
          : new Date().getUTCFullYear();

      if (
        !Number.isInteger(yearNumber) ||
        yearNumber < 1900 ||
        yearNumber > 2100
      ) {
        return res.status(400).json({
          success: false,
          message: "year must be between 1900 and 2100",
        });
      }

      if (month !== undefined) {
        const monthNumber = Number(month);

        if (
          !Number.isInteger(monthNumber) ||
          monthNumber < 1 ||
          monthNumber > 12
        ) {
          return res.status(400).json({
            success: false,
            message: "month must be between 1 and 12",
          });
        }

        filter.date = {
          $gte: new Date(Date.UTC(yearNumber, monthNumber - 1, 1)),
          $lt: new Date(Date.UTC(yearNumber, monthNumber, 1)),
        };
      } else {
        filter.date = {
          $gte: new Date(Date.UTC(yearNumber, 0, 1)),
          $lt: new Date(Date.UTC(yearNumber + 1, 0, 1)),
        };
      }
    }

    if (type) {
      filter.type = String(type);
    }

    if (location) {
      filter.$or = locationFilter(String(location));
    }

    if (search) {
      filter.name = {
        $regex: escapeRegex(String(search)),
        $options: "i",
      };
    }

    const { page, limit, skip } = getPagination(req.query);

    const sortOrder = req.query.sort === "desc" ? -1 : 1;

    const [holidays, total] = await Promise.all([
      Holiday.find(filter)
        .select("-createdBy -updatedBy -isDeleted")
        .sort({ date: sortOrder, name: 1 })
        .skip(skip)
        .limit(limit),

      Holiday.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Holidays fetched successfully",
      data: holidays,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get holidays error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch holidays",
    });
  }
};

export const getUpcomingHolidays = async (
  req: Request,
  res: Response
) => {
  try {
    const { from, location } = req.query;

    let fromDate = startOfTodayUtc();

    if (from) {
      const parsed = new Date(String(from));

      if (Number.isNaN(parsed.getTime())) {
        return res.status(400).json({
          success: false,
          message: "from must be a valid date (YYYY-MM-DD)",
        });
      }

      fromDate = new Date(
        Date.UTC(
          parsed.getUTCFullYear(),
          parsed.getUTCMonth(),
          parsed.getUTCDate()
        )
      );
    }

    const limit = Math.min(
      Math.max(parseInt(String(req.query.limit ?? "5"), 10) || 5, 1),
      50
    );

    const filter: Record<string, any> = {
      isDeleted: false,
      date: { $gte: fromDate },
    };

    if (location) {
      filter.$or = locationFilter(String(location));
    }

    const holidays = await Holiday.find(filter)
      .select("-createdBy -updatedBy -isDeleted")
      .sort({ date: 1, name: 1 })
      .limit(limit);

    return res.status(200).json({
      success: true,
      message: "Upcoming holidays fetched successfully",
      data: holidays,
    });
  } catch (error) {
    console.error("Get upcoming holidays error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch upcoming holidays",
    });
  }
};

export const getHolidayById = async (
  req: Request,
  res: Response
) => {
  try {
    const id = req.params.id as string;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid holiday ID",
      });
    }

    const holiday = await Holiday.findOne({
      _id: id,
      isDeleted: false,
    }).select("-createdBy -updatedBy -isDeleted");

    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: "Holiday not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Holiday fetched successfully",
      data: holiday,
    });
  } catch (error) {
    console.error("Get holiday error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch holiday",
    });
  }
};

export const updateHoliday = async (
  req: Request,
  res: Response
) => {
  try {
    const id = req.params.id as string;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid holiday ID",
      });
    }

    const result = updateHolidaySchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: result.error.flatten(),
      });
    }

    const data = result.data;

    const holiday = await Holiday.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: "Holiday not found",
      });
    }

    const nextName = data.name ?? holiday.name;
    const nextDate = data.date ?? holiday.date;

    if (data.name !== undefined || data.date !== undefined) {
      const duplicate = await findDuplicate(nextName, nextDate, id);

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message:
            "A holiday with the same name already exists on this date",
        });
      }
    }

    /*
     * Sending a non-empty locations list without isAllLocations
     * means "restrict to these locations".
     */
    let isAllLocations = data.isAllLocations ?? holiday.isAllLocations;

    if (
      data.isAllLocations === undefined &&
      (data.locations?.length ?? 0) > 0
    ) {
      isAllLocations = false;
    }

    let locations = data.locations ?? holiday.locations;

    if (isAllLocations) {
      locations = [];
    } else if (locations.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Select at least one location or mark the holiday for all locations",
      });
    }

    holiday.name = nextName;
    holiday.date = nextDate;
    holiday.type = data.type ?? holiday.type;

    if (data.description !== undefined) {
      holiday.description = data.description;
    }

    holiday.isAllLocations = isAllLocations;
    holiday.locations = locations;
    holiday.updatedBy = new Types.ObjectId(req.user!.id);

    await holiday.save();

    return res.status(200).json({
      success: true,
      message: "Holiday updated successfully",
      data: holiday,
    });
  } catch (error) {
    console.error("Update holiday error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update holiday",
    });
  }
};

export const deleteHoliday = async (
  req: Request,
  res: Response
) => {
  try {
    const id = req.params.id as string;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid holiday ID",
      });
    }

    const holiday = await Holiday.findOneAndUpdate(
      { _id: id, isDeleted: false },
      {
        isDeleted: true,
        updatedBy: new Types.ObjectId(req.user!.id),
      },
      { returnDocument: "after" }
    );

    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: "Holiday not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Holiday deleted successfully",
    });
  } catch (error) {
    console.error("Delete holiday error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete holiday",
    });
  }
};
