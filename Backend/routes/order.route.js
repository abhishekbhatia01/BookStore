const {
  fetchOrdersBySeller,
  fetchOrderbyorderId,
  cancelOrder,
  fetchAllOrders,
  fetchOrdersByUserId,
    orderDelivered,
} = require("../controllers/order.controller");
const express = require("express");
const router = express.Router();
const jwtAuth = require("../middleware/authMiddleware.middleware");
const authorizedRoles = require("../middleware/roles.middleware");

router.get(
  "/fetchAllOrders",
  jwtAuth,
  authorizedRoles("admin"),
  fetchAllOrders,
);
router.get(
  "/fetchOrdersBySeller",
  jwtAuth,
  authorizedRoles("seller"),
  fetchOrdersBySeller,
);
router.get("/fetchOrderbyUserId", jwtAuth, fetchOrdersByUserId);
router.get("/fetchOrderbyorderId/:id", jwtAuth, fetchOrderbyorderId);
router.put("/cancelOrder/:id", jwtAuth, cancelOrder);
router.put("/orderDelivered/:id", jwtAuth, authorizedRoles("admin", "seller"), orderDelivered);

module.exports = router;
