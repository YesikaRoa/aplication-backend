import { DashboardModel } from '../models/dashboard.model.js'

const getDashboardData = async (req, res, next) => {
  try {
    const { id, role } = req.user
    const data = await DashboardModel.getDashboardStats(id, role)

    res.status(200).json(data)
  } catch (error) {
    next(error)
  }
}

export const DashboardController = {
  getDashboardData,
}
