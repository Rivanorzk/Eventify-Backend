    import asyncHandler from "../lib/utils/asyncHandler.js";
    import { success } from "../lib/utils/response.js";

    import * as orderService from "../lib/services/orderService.js";

    export const getOrders = asyncHandler(async (req, res) => {

        const orders = await orderService.getOrders();

        return success(res, orders);

    });

    export const getMyOrders = asyncHandler(async (req, res) => {

        const orders =
            await orderService.getMyOrders(req.user.id);

        return success(res, orders);

    });

    export const getOrderById = asyncHandler(async (req, res) => {

        const order =
            await orderService.getOrderById(
                req.params.id,
                req.user.id,
                req.user.role
            );

        return success(res, order);

    });

    export const createOrder = asyncHandler(async (req, res) => {

        const order =
            await orderService.createOrder(
                req.user.id,
                req.body
            );

        return success(
            res,
            order,
            "Order berhasil dibuat",
            201
        );

    });

    export const cancelOrder = asyncHandler(async (req, res) => {

        await orderService.cancelOrder(
            req.params.id,
            req.user.id,
            req.user.role
        );

        return success(
            res,
            null,
            "Order berhasil dibatalkan"
        );

    });