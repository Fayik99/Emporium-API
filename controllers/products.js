const Product = require('../models/Product');
const Category = require('../models/Category');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc            Get all products
// @route           GET /api/v1/products
// @route           GET /api/v1/categories/:categoryId/products
// @access          Public
exports.getProducts = asyncHandler(async (req, res, next) => {
    let query;

    const reqQuery = { ...req.query };

    // Fields to exclude
    const removeFields = ['select', 'sort', 'page', 'limit'];

    // Loop over removeFields and delete them from reqQuery
    removeFields.forEach((param) => delete reqQuery[param]);

    let queryStr = JSON.stringify(reqQuery);

    // Create operators ($gt, $gte, $lt, $lte, $in)
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, (match) => `$${match}`);

    // Finding resource
    if (req.params.categoryId) {
        query = Product.find({ ...JSON.parse(queryStr), category: req.params.categoryId });
    } else {
        query = Product.find(JSON.parse(queryStr)).populate({
            path: 'category',
            select: 'name slug',
        });
    }
    // query = Product.find(JSON.parse(queryStr));

    // Select Fields
    if (req.query.select) {
        const fields = req.query.select.split(',').join(' ');
        query = query.select(fields);
    }

    // Sort
    if (req.query.sort) {
        const sortBy = req.query.sort.split(',').join(' ');
        query = query.sort(sortBy);
    } else {
        query = query.sort('-createdAt');
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Product.countDocuments(JSON.parse(queryStr));

    query = query.skip(startIndex).limit(limit);

    // Executing query
    const products = await query;

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
        pagination.next = {
            page: page + 1,
            limit,
        };
    }

    if (startIndex > 0) {
        pagination.prev = {
            page: page - 1,
            limit,
        };
    }

    res.status(200).json({ success: true, count: products.length, pagination, data: products });
});

// @desc            Get single products
// @route           GET /api/v1/products/:id
// @access          Public
exports.getProduct = asyncHandler(async (req, res, next) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
        return next(new ErrorResponse(`Resource not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({ success: true, data: product });
});

// @desc            Create new product
// @route           POST /api/v1/categories/:categoryId/products
// @access          Private
exports.createProduct = asyncHandler(async (req, res, next) => {
    req.body.category = req.params.categoryId;

    const category = await Category.findById(req.params.categoryId);

    if (!category) {
        return next(new ErrorResponse(`No category with the id of ${req.params.id}`, 404));
    }

    const product = await Product.create(req.body);

    res.status(201).json({ success: true, data: product });
});

// @desc            Update product
// @route           PUT /api/v1/products/:id
// @access          Private
exports.updateProduct = asyncHandler(async (req, res, next) => {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

    if (!product) {
        return next(new ErrorResponse(`Resource not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({ success: true, data: product });
});

// @desc            Delete product
// @route           DELETE /api/v1/products/:id
// @access          Private
exports.deleteProduct = asyncHandler(async (req, res, next) => {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
        return next(new ErrorResponse(`Resource not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({ success: true, data: {} });
});