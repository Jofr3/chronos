import { database_service } from "../../services/database"

export default defineEventHandler(async () => {
  const res = await database_service.getAll();
  return { tasks: res };
})
