// import { database_service } from "../../services/database"

export default defineEventHandler(async () => {
  // const res = await database_service.getAll();
  let res = "lol";
  return { tasks: res };
})
