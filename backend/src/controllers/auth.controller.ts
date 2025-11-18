import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import User from "../models/user.model";

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
  res: Response
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
    console.error("❌ Profile error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

export const updateProfile = async (
  req: AuthenticatedRequest,
  res: Response
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

    const { name, email, address } = req.body as {
      name?: string;
      email?: string;
      address?: AddressDto;
    };

    if (typeof name === "string") user.name = name;
    if (typeof email === "string") user.email = email;

    if (address && typeof address === "object") {
      user.address = {
        line1: address.line1 ?? user.address?.line1 ?? "",
        line2: address.line2 ?? user.address?.line2 ?? "",
        city: address.city ?? user.address?.city ?? "",
        state: address.state ?? user.address?.state ?? "",
        postalCode: address.postalCode ?? user.address?.postalCode ?? "",
        country: address.country ?? user.address?.country ?? "United States",
      };
    }

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
    console.error("❌ Update profile error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
};
