import { ProfessionalModel } from '../models/professionals.model.js'
import { hashPassword } from '../utils/password.js'

const createProfessionalWithUser = async (req, res, next) => {
  try {
    const { user, professional, specialties } = req.body
    const hashedPassword = await hashPassword(user.password)
    const userData = { ...user, password: hashedPassword }
    const result = await ProfessionalModel.createProfessionalWithUser({
      user: userData,
      professional,
      specialties,
    })

    const { id, first_name, last_name, email, status } = result.user
    const {
      id: professional_id,
      user_id,
      professional_type_id,
      biography,
      years_of_experience,
    } = result.professional

    res.status(201).json({
      message: 'Profesional y usuario creados con éxito',
      user: { id, first_name, last_name, email, status },
      professional: {
        id: professional_id,
        user_id,
        professional_type_id,
        biography,
        years_of_experience,
      },
      specialties: result.specialties,
      subspecialties: result.subspecialties,
    })
  } catch (error) {
    next(error)
  }
}

const getAllProfessionals = async (req, res, next) => {
  try {
    const professionals = await ProfessionalModel.getAllProfessionals()
    res.status(200).json(professionals)
  } catch (error) {
    next(error)
  }
}

const getProfessionalById = async (req, res, next) => {
  try {
    const { id } = req.params
    const professional = await ProfessionalModel.getProfessionalById(id)
    res.status(200).json(professional)
  } catch (error) {
    next(error)
  }
}

const updateProfessional = async (req, res, next) => {
  try {
    const { id } = req.params
    const { professional, specialties, ...userFields } = req.body

    const professionalUpdates = professional || {}
    const allowedUserFields = ['first_name', 'last_name', 'email', 'address', 'phone']
    const userUpdates = {}
    for (const key of allowedUserFields) {
      if (userFields[key] !== undefined) userUpdates[key] = userFields[key]
    }

    const result = await ProfessionalModel.updateProfessionalAndUser(
      id,
      professionalUpdates,
      userUpdates,
      specialties,
    )

    res.status(200).json({
      message: 'Profesional y usuario actualizados con éxito',
      professional: result.professional,
      user: result.user,
      specialties: result.specialties,
    })
  } catch (error) {
    next(error)
  }
}

const deleteProfessional = async (req, res, next) => {
  try {
    const { id } = req.params
    await ProfessionalModel.deleteProfessionalAndUser(id)
    res.status(200).json({ message: 'Profesional y usuario eliminados con éxito' })
  } catch (error) {
    next(error)
  }
}

export const ProfessionalsController = {
  createProfessionalWithUser,
  getAllProfessionals,
  getProfessionalById,
  updateProfessional,
  deleteProfessional,
}
