import { ProfessionalModel } from '../models/professionals.model.js'

const createProfessionalWithUser = async (req, res, next) => {
  try {
    const { user, professional, specialties } = req.body
    const result = await ProfessionalModel.createProfessionalWithUser({
      user,
      professional,
      specialties,
    })

    res.status(201).json({
      message: 'Profesional y usuario creados con éxito',
      user: result.user,
      professional: result.professional,
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
    const result = await ProfessionalModel.updateProfessionalAndUser(
      id,
      professional,
      userFields,
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
