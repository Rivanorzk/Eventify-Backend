import asyncHandler from "../lib/utils/asyncHandler.js";
import { success } from "../lib/utils/response.js";

import * as categoryService from "../lib/services/categoryService.js";

export const getCategories = asyncHandler(
    async (req, res) => {
        const categories =
            await categoryService.getAllCategories();

        return success(
            res,
            categories,
            "Categories retrieved successfully"
        );
    }
);

export const getCategoryById = asyncHandler(
    async (req, res) => {
        const { id } = req.params;

        const category =
            await categoryService.getCategoryById(id);

        return success(
            res,
            category,
            "Category retrieved successfully"
        );
    }
);

export const createCategory = asyncHandler(
    async (req, res) => {
        const category =
            await categoryService.createCategory(
                req.body
            );

        return success(
            res,
            category,
            "Category created successfully",
            201
        );
    }
);

export const updateCategory = asyncHandler(
    async (req, res) => {
        const { id } = req.params;

        const category =
            await categoryService.updateCategory(
                id,
                req.body
            );

        return success(
            res,
            category,
            "Category updated successfully"
        );
    }
);

export const deleteCategory = asyncHandler(
    async (req, res) => {
        const { id } = req.params;

        await categoryService.deleteCategory(id);

        return success(
            res,
            null,
            "Category deleted successfully"
        );
    }
);