"use client";

import React, { useEffect, useState, useRef } from "react";
import { DataGrid, GridColDef, GridActionsCellItem } from "@mui/x-data-grid";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Button as MuiButton,
  Box,
  Select,
  MenuItem,
} from "@mui/material";
import axios from "@/lib/axios";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import ImageIcon from "@mui/icons-material/Image";
import imageCompression from "browser-image-compression";
import { normalizeImageSrc } from "@/lib/images";

interface Product {
  _id?: string;
  id?: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string | File;
  stock: number;
  featured: boolean;
  ingredients?: string;
  benefits?: string;
  howToUse?: string;
}

export default function AdminProductTable({ refresh }: { refresh?: boolean }) {
  const [rows, setRows] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Product>>({
    _id: "",
    name: "",
    description: "",
    price: 0,
    category: "",
    image: "",
    stock: 0,
    featured: false,
    ingredients: "",
    benefits: "",
    howToUse: "",
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const imageUrlRef = useRef<string | null>(null);

  const loadProducts = async () => {
    try {
      const res = await axios.get("/products");
      setRows([...res.data.products]);
    } catch {
      setRows([]);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [refresh]);

  const handleOpen = (row?: Product) => {
    if (row) {
      const id = row._id ?? row.id ?? "";
      setEditId(id);
      setForm({
        _id: id,
        name: row.name,
        description: row.description,
        price: row.price,
        category: row.category,
        image: row.image,
        stock: row.stock,
        featured: row.featured,
        ingredients: row.ingredients || "",
        benefits: row.benefits || "",
        howToUse: row.howToUse || "",
      });
    } else {
      setEditId(null);
      setForm({
        _id: "",
        name: "",
        description: "",
        price: 0,
        category: "",
        image: "",
        stock: 0,
        featured: false,
        ingredients: "",
        benefits: "",
        howToUse: "",
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditId(null);
    if (imageUrlRef.current) {
      URL.revokeObjectURL(imageUrlRef.current);
      imageUrlRef.current = null;
    }
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);

    try {
      const formData = new FormData();
      formData.append("name", form.name || "");
      formData.append("description", form.description || "");
      formData.append("price", String(form.price ?? 0));
      formData.append("category", form.category || "");
      formData.append("stock", String(form.stock ?? 0));
      formData.append("featured", form.featured ? "true" : "false");
      formData.append("ingredients", form.ingredients || "");
      formData.append("benefits", form.benefits || "");
      formData.append("howToUse", form.howToUse || "");

      if (form.image && typeof form.image !== "string") {
        formData.append("image", form.image);
      }

      if (editId) {
        await axios.put(`/products/${editId}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await axios.post("/products", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      handleClose();
      loadProducts();
    } catch (err) {
      console.error("Save failed", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: Product) => {
    const id = row._id ?? row.id;
    if (!id) return;
    if (!confirm("Delete this product?")) return;
    try {
      await axios.delete(`/products/${id}`);
      loadProducts();
    } catch {
      alert("Error deleting product");
    }
  };

  const columns: GridColDef<Product>[] = [
    { field: "name", headerName: "Name", flex: 1, minWidth: 150 },
    {
      field: "price",
      headerName: "Price",
      type: "number",
      flex: 0.5,
      minWidth: 100,
      renderCell: (params) => (
        <span>${(params.row.price ?? 0).toFixed(2)}</span>
      ),
    },
    { field: "category", headerName: "Category", flex: 0.7, minWidth: 120 },
    {
      field: "stock",
      headerName: "Stock",
      type: "number",
      flex: 0.5,
      minWidth: 90,
    },
    {
      field: "featured",
      headerName: "Featured",
      flex: 0.5,
      minWidth: 100,
      renderCell: (params) => <span>{params.row.featured ? "Yes" : "No"}</span>,
    },
    {
      field: "image",
      headerName: "Preview",
      flex: 1,
      minWidth: 120,
      renderCell: (params) => {
        const rawImage = params.row.image;

        if (!rawImage || typeof rawImage !== "string") {
          return <span className="text-gray-400 text-sm italic">No Image</span>;
        }

        return (
          <img
            src={normalizeImageSrc(rawImage)}
            alt={params.row.name}
            className="h-16 w-16 object-cover rounded"
          />
        );
      },
    },
    {
      field: "actions",
      type: "actions",
      headerName: "Actions",
      flex: 0.7,
      minWidth: 130,
      getActions: (params) => [
        <GridActionsCellItem
          key="edit"
          icon={<EditIcon />}
          label="Edit"
          onClick={() => handleOpen(params.row)}
        />,
        <GridActionsCellItem
          key="delete"
          icon={<DeleteIcon />}
          label="Delete"
          onClick={() => handleDelete(params.row)}
        />,
      ],
    },
  ];

  return (
    <Box>
      <Box mb={2}>
        <MuiButton
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
          disabled={saving}
        >
          Add Product
        </MuiButton>
      </Box>
      <div style={{ height: 600, width: "100%" }}>
        <DataGrid<Product>
          rows={rows}
          columns={columns}
          initialState={{
            pagination: { paginationModel: { pageSize: 10, page: 0 } },
          }}
          pageSizeOptions={[10]}
          disableRowSelectionOnClick
          getRowId={(row) => row._id ?? row.id ?? ""}
          loading={saving}
        />
      </div>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? "Edit Product" : "Add Product"}</DialogTitle>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          <DialogContent className="space-y-4">
            <TextField
              label="Name"
              fullWidth
              value={form.name || ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <TextField
              label="Description"
              fullWidth
              value={form.description || ""}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
            <TextField
              label="Price"
              type="number"
              fullWidth
              value={form.price ?? ""}
              onChange={(e) =>
                setForm({ ...form, price: parseFloat(e.target.value) })
              }
            />
            <TextField
              label="Category"
              fullWidth
              value={form.category || ""}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />

            <Box>
              <label htmlFor="upload-image">
                <MuiButton
                  component="span"
                  variant="outlined"
                  startIcon={<ImageIcon />}
                >
                  {form.image ? "Change Image" : "Upload Image"}
                </MuiButton>
              </label>
              <input
                id="upload-image"
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  const options = {
                    maxSizeMB: 1,
                    maxWidthOrHeight: 800,
                    useWebWorker: true,
                  };

                  try {
                    const compressedFile = await imageCompression(
                      file,
                      options
                    );

                    const fixedFile = new File([compressedFile], file.name, {
                      type: compressedFile.type,
                      lastModified: Date.now(),
                    });

                    if (imageUrlRef.current) {
                      URL.revokeObjectURL(imageUrlRef.current);
                    }
                    imageUrlRef.current = URL.createObjectURL(fixedFile);
                    setForm({ ...form, image: fixedFile });
                  } catch (err) {
                    console.error("Image compression failed", err);
                  }
                }}
              />
              {form.image && (
                <Box mt={2}>
                  <img
                    src={
                      typeof form.image === "string"
                        ? normalizeImageSrc(form.image)
                        : imageUrlRef.current || ""
                    }
                    alt="Preview"
                    style={{
                      width: "100%",
                      maxHeight: 200,
                      objectFit: "cover",
                      borderRadius: 8,
                    }}
                  />
                </Box>
              )}
            </Box>

            <TextField
              label="Stock"
              type="number"
              fullWidth
              value={form.stock ?? ""}
              onChange={(e) =>
                setForm({ ...form, stock: parseInt(e.target.value, 10) })
              }
            />
            <TextField
              label="Ingredients"
              fullWidth
              value={form.ingredients || ""}
              onChange={(e) =>
                setForm({ ...form, ingredients: e.target.value })
              }
            />
            <TextField
              label="Benefits"
              fullWidth
              value={form.benefits || ""}
              onChange={(e) => setForm({ ...form, benefits: e.target.value })}
            />
            <TextField
              label="How to Use"
              fullWidth
              value={form.howToUse || ""}
              onChange={(e) => setForm({ ...form, howToUse: e.target.value })}
            />
            <Select
              fullWidth
              value={form.featured ? "true" : "false"}
              onChange={(e) =>
                setForm({ ...form, featured: e.target.value === "true" })
              }
            >
              <MenuItem value="false">Products Page</MenuItem>
              <MenuItem value="true">Home – Featured</MenuItem>
            </Select>
            <Box mt={2} display="flex" justifyContent="flex-end" gap={1}>
              <MuiButton onClick={handleClose} disabled={saving}>
                Cancel
              </MuiButton>
              <MuiButton type="submit" variant="contained" disabled={saving}>
                {editId ? "Update" : "Create"}
              </MuiButton>
            </Box>
          </DialogContent>
        </form>
      </Dialog>
    </Box>
  );
}
