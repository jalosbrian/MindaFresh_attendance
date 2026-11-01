// shared/services/stockService.js  (owner: Bren, POS)
// The ONLY place stock changes. deductStock and returnStock must run inside the caller's transaction,
// so the order or sale and its stock change succeed or fail together (blueprint Section 5).
// Bren adds receiveStock (weighted average cost) and adjustStock for POS.
import { Product, StockLevel, StockMovement } from "../models/index.js";
import { AppError } from "../utils/appError.js";

// items: [{ product_id, quantity }]. Pass sale_id (POS) OR order_id (Shop), never both.
export async function deductStock({ items, sale_id = null, order_id = null, employee_id = null }, t) {
  if (!t) throw new Error("deductStock must run inside a transaction");
  if (!sale_id === !order_id) throw new Error("Pass exactly one of sale_id or order_id");
  const movement_type = sale_id ? "sale" : "online_order";
  const source = sale_id ? { sale_id } : { order_id };
  const already = await StockMovement.count({ where: { ...source, movement_type }, transaction: t });
  if (already) throw new AppError("DUPLICATE", "Stock for this sale or order was already deducted.");

  const sorted = [...items].sort((a, b) => a.product_id - b.product_id); // same lock order everywhere
  const results = [];
  for (const { product_id, quantity } of sorted) {
    const product = await Product.findByPk(product_id, { transaction: t });
    if (!product || product.status !== "active")
      throw new AppError("PRODUCT_UNAVAILABLE", `Product ${product?.product_code ?? product_id} is not available.`);

    const level = await StockLevel.findOne({ where: { product_id }, transaction: t, lock: t.LOCK.UPDATE });
    if (!level || level.quantity_on_hand < quantity)
      throw new AppError("INSUFFICIENT_STOCK", `Only ${level ? level.quantity_on_hand : 0} left of ${product.name}.`);

    const before = level.quantity_on_hand;
    level.quantity_on_hand = before - quantity;
    await level.save({ transaction: t });

    const movement = await StockMovement.create({
      product_id, movement_type, quantity_change: -quantity,
      quantity_before: before, quantity_after: level.quantity_on_hand,
      unit_cost: product.cost_price, ...source, employee_id
    }, { transaction: t });
    results.push({ product_id, unit_cost: product.cost_price, movement_code: movement.movement_code });
  }
  return results; // the caller saves unit_cost into its sale_items / order_items
}

// Puts back exactly what deductStock took for this sale or order, at the same unit_cost.
export async function returnStock({ sale_id = null, order_id = null, employee_id = null }, t) {
  if (!t) throw new Error("returnStock must run inside a transaction");
  if (!sale_id === !order_id) throw new Error("Pass exactly one of sale_id or order_id");
  const source = sale_id ? { sale_id } : { order_id };
  const deductType = sale_id ? "sale" : "online_order";

  const returned = await StockMovement.count({ where: { ...source, movement_type: "return" }, transaction: t });
  if (returned) throw new AppError("DUPLICATE", "Stock for this sale or order was already returned.");

  const taken = await StockMovement.findAll({ where: { ...source, movement_type: deductType }, transaction: t });
  const sorted = [...taken].sort((a, b) => a.product_id - b.product_id);
  const results = [];
  for (const m of sorted) {
    const quantity = -m.quantity_change;
    const level = await StockLevel.findOne({ where: { product_id: m.product_id }, transaction: t, lock: t.LOCK.UPDATE });
    const before = level.quantity_on_hand;
    level.quantity_on_hand = before + quantity;
    await level.save({ transaction: t });

    const movement = await StockMovement.create({
      product_id: m.product_id, movement_type: "return", quantity_change: quantity,
      quantity_before: before, quantity_after: level.quantity_on_hand,
      unit_cost: m.unit_cost, ...source, employee_id
    }, { transaction: t });
    results.push({ product_id: m.product_id, quantity, movement_code: movement.movement_code });
  }
  return results;
}
