import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import User from "../models/user.model";
import { profileSchema } from "../security/validation";

type AddressDto = {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
};

export const getProfile = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const fullAddress = (user as any).fullAddress as string | null;

    res.status(200).json({
      user: {
        _id: user.id,
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        address: user.address || undefined,
        fullAddress: fullAddress ?? undefined,
      },
    });
  } catch (error) {
    console.error("❌ Profile error:");
    res.status(500).json({ message: "Something went wrong" });
  }
};

export const updateProfile = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({
          message: "Invalid profile. Change email through verification.",
        });
      return;
    }
    const { name, address } = parsed.data;
    if (name !== undefined) user.name = name;
    if (address !== undefined) user.address = address;

    await user.save();

    const fullAddress = (user as any).fullAddress as string | null;

    res.status(200).json({
      user: {
        _id: user.id,
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        address: user.address || undefined,
        fullAddress: fullAddress ?? undefined,
      },
    });
  } catch (error) {
    console.error("❌ Update profile error:");
    res.status(500).json({ message: "Something went wrong" });
  }
};
