import * as categoryRepository from "../repositories/categoryRepository.js";
import AppError from "../utils/AppError.js";

export const getAllCategories = async () => {
   try {
        const categories = await categoryRepository.findAll();
        
        return categories.map(category => ({
            ...category,
            id: Number(category.id)
        }));
    } catch (error) {
        console.error('Error getting categories:', error);
        throw error;
    }
};

export const getCategoryById = async (id) => {
    if (!id) {
        throw new AppError(
            "Category ID is required",
            400
        );
    }

    const category =
        await categoryRepository.findById(id);

    if (!category) {
        throw new AppError(
            "Category not found",
            404
        );
    }

    return category;
};

export const createCategory = async (data) => {
    const {
        categoryName,
        description,
        icon,
    } = data;

    if (!categoryName) {
        throw new AppError(
            "Category name is required",
            400
        );
    }

    const existingCategory =
        await categoryRepository.findByName(
            categoryName
        );

    if (existingCategory) {
        throw new AppError(
            "Category already exists",
            409
        );
    }

    return await categoryRepository.create({
        categoryName: categoryName.trim(),
        description:
            description?.trim() || null,
        icon: icon?.trim() || null,
    });
};

export const updateCategory = async (
    id,
    data
) => {
    const {
        categoryName,
        description,
        icon,
    } = data;

    if (!id) {
        throw new AppError(
            "Category ID is required",
            400
        );
    }

    const existingCategory =
        await categoryRepository.findById(id);

    if (!existingCategory) {
        throw new AppError(
            "Category not found",
            404
        );
    }

    if (!categoryName) {
        throw new AppError(
            "Category name is required",
            400
        );
    }

    const duplicateCategory =
        await categoryRepository.findByName(
            categoryName
        );

    if (
        duplicateCategory &&
        duplicateCategory.id !== Number(id)
    ) {
        throw new AppError(
            "Category already exists",
            409
        );
    }

    return await categoryRepository.update(
        id,
        {
            categoryName: categoryName.trim(),
            description:
                description?.trim() || null,
            icon: icon?.trim() || null,
        }
    );
};

export const deleteCategory = async (id) => {
    if (!id) {
        throw new AppError(
            "Category ID is required",
            400
        );
    }

    const category =
        await categoryRepository.findById(id);

    if (!category) {
        throw new AppError(
            "Category not found",
            404
        );
    }

    return await categoryRepository.remove(id);
};