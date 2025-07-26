import axios from 'axios'

const API_BASE_URL = 'http://localhost:3000/api'

export interface Category {
  id: string
  name: string
  description?: string
  color: string
  icon?: string
  parent_id?: string
  sort_order: number
  is_active: boolean
  imageCount?: number
  children?: Category[]
  parent?: Category
  created_at: string
  updated_at: string
}

export interface CreateCategoryData {
  name: string
  description?: string
  color?: string
  icon?: string
  parent_id?: string
  sort_order?: number
}

export interface UpdateCategoryData {
  name?: string
  description?: string
  color?: string
  icon?: string
  parent_id?: string
  sort_order?: number
  is_active?: boolean
}

class CategoryService {
  // 获取所有分类（树形结构）
  async getCategories(): Promise<Category[]> {
    const response = await axios.get(`${API_BASE_URL}/categories`)
    return response.data.data
  }

  // 获取单个分类详情
  async getCategory(id: string): Promise<Category> {
    const response = await axios.get(`${API_BASE_URL}/categories/${id}`)
    return response.data.data
  }

  // 创建新分类
  async createCategory(data: CreateCategoryData): Promise<Category> {
    const response = await axios.post(`${API_BASE_URL}/categories`, data)
    return response.data.data
  }

  // 更新分类
  async updateCategory(id: string, data: UpdateCategoryData): Promise<Category> {
    const response = await axios.put(`${API_BASE_URL}/categories/${id}`, data)
    return response.data.data
  }

  // 删除分类
  async deleteCategory(id: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/categories/${id}`)
  }

  // 获取分类下的图片
  async getCategoryImages(
    id: string,
    params: {
      page?: number
      limit?: number
      sort?: string
      order?: 'ASC' | 'DESC'
    } = {}
  ) {
    const response = await axios.get(`${API_BASE_URL}/categories/${id}/images`, {
      params
    })
    return response.data.data
  }
}

export const categoryService = new CategoryService()
export default categoryService
