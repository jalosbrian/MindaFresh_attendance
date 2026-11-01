// shared/models/codeHook.js
// Gives a model its display code (PREFIX-0001) right after insert, from the row's id.
// The transaction is passed through, or the save waits on its own insert and times out (blueprint Section 3).
export function addCodeHook(Model, column, prefix) {
  Model.afterCreate(async (row, options) => {
    row[column] = `${prefix}-${String(row.id).padStart(4, "0")}`;
    await row.save({ hooks: false, transaction: options.transaction });
  });
}
