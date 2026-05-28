import { CompanyRepository } from '../repositories/companyRepository';
import { BranchRepository } from '../repositories/branchRepository';
import { DepartmentRepository } from '../repositories/departmentRepository';
import { UserRepository } from '../repositories/userRepository';
import { RoleRepository } from '../repositories/roleRepository';

interface CreateCompanyDTO {
  name: string;
  code: string;
  status?: 'active' | 'inactive';
}

interface CreateBranchDTO {
  companyId: number;
  name: string;
  code: string;
  type?: 'office' | 'warehouse' | 'factory';
  status?: 'active' | 'inactive';
}

interface CreateDepartmentDTO {
  companyId: number;
  branchId: number;
  name: string;
  code: string;
  status?: 'active' | 'inactive';
}

interface CreateUserDTO {
  companyId: number;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  departmentId?: number;
  branchId?: number;
  phoneNumber?: string;
  status?: 'active' | 'inactive';
}

interface CreateRoleDTO {
  companyId: number;
  name: string;
  code: string;
  description?: string;
  hierarchyLevel?: number;
  status?: 'active' | 'inactive';
}

interface PaginationParams {
  skip?: number;
  take?: number;
  search?: string;
  status?: string;
}

/**
 * Master Data Service
 * Orcherstrates all master data operations (Company, Branch, Department, User, Role)
 */
export class MasterDataService {
  /**
   * ==================== COMPANY SERVICE ====================
   */

  static async createCompany(data: CreateCompanyDTO) {
    // Check if code already exists
    if (await CompanyRepository.codeExists(data.code)) {
      throw new Error(`Company code '${data.code}' already exists`);
    }

    return CompanyRepository.create({
      name: data.name,
      code: data.code,
      status: data.status || 'active',
    });
  }

  static async getCompany(id: number) {
    const company = await CompanyRepository.findById(id);
    if (!company) {
      throw new Error(`Company ${id} not found`);
    }
    return company;
  }

  static async listCompanies(params: PaginationParams) {
    const skip = params.skip || 0;
    const take = params.take || 50;

    return CompanyRepository.findAll(skip, take, {
      status: params.status,
      search: params.search,
    });
  }

  static async updateCompany(id: number, data: Partial<CreateCompanyDTO>) {
    const company = await CompanyRepository.findById(id);
    if (!company) {
      throw new Error(`Company ${id} not found`);
    }

    // Check if new code already exists
    if (data.code && data.code !== company.code) {
      if (await CompanyRepository.codeExists(data.code, id)) {
        throw new Error(`Company code '${data.code}' already exists`);
      }
    }

    return CompanyRepository.update(id, data);
  }

  static async deactivateCompany(id: number) {
    const company = await CompanyRepository.findById(id);
    if (!company) {
      throw new Error(`Company ${id} not found`);
    }
    return CompanyRepository.deactivate(id);
  }

  static async deleteCompany(id: number) {
    // Check if company has branches
    const branches = await BranchRepository.findByCompany(id, 0, 1);
    if (branches.total > 0) {
      throw new Error(`Cannot delete company with existing branches`);
    }

    return CompanyRepository.delete(id);
  }

  /**
   * ==================== BRANCH SERVICE ====================
   */

  static async createBranch(data: CreateBranchDTO) {
    // Verify company exists
    const company = await CompanyRepository.findById(data.companyId);
    if (!company) {
      throw new Error(`Company ${data.companyId} not found`);
    }

    // Check if code already exists in company
    if (await BranchRepository.codeExistsInCompany(data.companyId, data.code)) {
      throw new Error(
        `Branch code '${data.code}' already exists in company ${data.companyId}`
      );
    }

    return BranchRepository.create({
      company: { connect: { id: data.companyId } },
      name: data.name,
      code: data.code,
      type: data.type || 'office',
      status: data.status || 'active',
    });
  }

  static async getBranch(id: number) {
    const branch = await BranchRepository.findById(id);
    if (!branch) {
      throw new Error(`Branch ${id} not found`);
    }
    return branch;
  }

  static async listBranches(companyId: number, params: PaginationParams) {
    // Verify company exists
    const company = await CompanyRepository.findById(companyId);
    if (!company) {
      throw new Error(`Company ${companyId} not found`);
    }

    const skip = params.skip || 0;
    const take = params.take || 50;

    return BranchRepository.findByCompany(companyId, skip, take, {
      status: params.status,
      search: params.search,
    });
  }

  static async updateBranch(id: number, data: Partial<CreateBranchDTO>) {
    const branch = await BranchRepository.findById(id);
    if (!branch) {
      throw new Error(`Branch ${id} not found`);
    }

    // Check if new code already exists in company
    if (data.code && data.code !== branch.code) {
      if (await BranchRepository.codeExistsInCompany(branch.companyId, data.code, id)) {
        throw new Error(`Branch code '${data.code}' already exists`);
      }
    }

    return BranchRepository.update(id, data);
  }

  static async deactivateBranch(id: number) {
    const branch = await BranchRepository.findById(id);
    if (!branch) {
      throw new Error(`Branch ${id} not found`);
    }
    return BranchRepository.deactivate(id);
  }

  static async deleteBranch(id: number) {
    // Check if branch has departments
    const departments = await DepartmentRepository.findByBranch(id, 0, 1);
    if (departments.total > 0) {
      throw new Error(`Cannot delete branch with existing departments`);
    }

    return BranchRepository.delete(id);
  }

  /**
   * ==================== DEPARTMENT SERVICE ====================
   */

  static async createDepartment(data: CreateDepartmentDTO) {
    // Verify branch exists
    const branch = await BranchRepository.findById(data.branchId);
    if (!branch) {
      throw new Error(`Branch ${data.branchId} not found`);
    }

    // Check if code already exists in branch
    if (await DepartmentRepository.codeExistsInBranch(data.branchId, data.code)) {
      throw new Error(
        `Department code '${data.code}' already exists in branch ${data.branchId}`
      );
    }

    return DepartmentRepository.create({
      company: { connect: { id: data.companyId } },
      branch: { connect: { id: data.branchId } },
      name: data.name,
      code: data.code,
      status: data.status || 'active',
    });
  }

  static async getDepartment(id: number) {
    const dept = await DepartmentRepository.findById(id);
    if (!dept) {
      throw new Error(`Department ${id} not found`);
    }
    return dept;
  }

  static async listDepartments(branchId: number, params: PaginationParams) {
    // Verify branch exists
    const branch = await BranchRepository.findById(branchId);
    if (!branch) {
      throw new Error(`Branch ${branchId} not found`);
    }

    const skip = params.skip || 0;
    const take = params.take || 50;

    return DepartmentRepository.findByBranch(branchId, skip, take, {
      status: params.status,
      search: params.search,
    });
  }

  static async updateDepartment(id: number, data: Partial<CreateDepartmentDTO>) {
    const dept = await DepartmentRepository.findById(id);
    if (!dept) {
      throw new Error(`Department ${id} not found`);
    }

    // Check if new code already exists
    if (data.code && data.code !== dept.code) {
      if (await DepartmentRepository.codeExistsInBranch(dept.branchId, data.code, id)) {
        throw new Error(`Department code '${data.code}' already exists`);
      }
    }

    return DepartmentRepository.update(id, data);
  }

  static async deactivateDepartment(id: number) {
    const dept = await DepartmentRepository.findById(id);
    if (!dept) {
      throw new Error(`Department ${id} not found`);
    }
    return DepartmentRepository.deactivate(id);
  }

  static async deleteDepartment(id: number) {
    return DepartmentRepository.delete(id);
  }

  /**
   * ==================== USER SERVICE ====================
   */

  static async createUser(data: CreateUserDTO) {
    // Verify company exists
    const company = await CompanyRepository.findById(data.companyId);
    if (!company) {
      throw new Error(`Company ${data.companyId} not found`);
    }

    // Check if email already exists
    if (await UserRepository.emailExists(data.email)) {
      throw new Error(`User with email '${data.email}' already exists`);
    }

    // Check if username already exists
    if (data.username && (await UserRepository.usernameExists(data.username))) {
      throw new Error(`Username '${data.username}' already exists`);
    }

    return UserRepository.create({
      company: { connect: { id: data.companyId } },
      email: data.email,
      username: data.username,
      firstName: data.firstName,
      lastName: data.lastName,
      ...(data.departmentId && { department: { connect: { id: data.departmentId } } }),
      ...(data.branchId && { branch: { connect: { id: data.branchId } } }),
      phoneNumber: data.phoneNumber,
      status: data.status || 'active',
    });
  }

  static async getUser(id: number) {
    const user = await UserRepository.findById(id);
    if (!user) {
      throw new Error(`User ${id} not found`);
    }
    return user;
  }

  static async listUsers(companyId: number, params: PaginationParams) {
    // Verify company exists
    const company = await CompanyRepository.findById(companyId);
    if (!company) {
      throw new Error(`Company ${companyId} not found`);
    }

    const skip = params.skip || 0;
    const take = params.take || 50;

    return UserRepository.findByCompany(companyId, skip, take, {
      status: params.status,
      search: params.search,
    });
  }

  static async updateUser(id: number, data: Partial<CreateUserDTO>) {
    const user = await UserRepository.findById(id);
    if (!user) {
      throw new Error(`User ${id} not found`);
    }

    // Check if new email already exists
    if (data.email && data.email !== user.email) {
      if (await UserRepository.emailExists(data.email, id)) {
        throw new Error(`Email '${data.email}' already exists`);
      }
    }

    // Check if new username already exists
    if (data.username && data.username !== user.username) {
      if (await UserRepository.usernameExists(data.username, id)) {
        throw new Error(`Username '${data.username}' already exists`);
      }
    }

    return UserRepository.update(id, data);
  }

  static async deactivateUser(id: number) {
    const user = await UserRepository.findById(id);
    if (!user) {
      throw new Error(`User ${id} not found`);
    }
    return UserRepository.deactivate(id);
  }

  static async deleteUser(id: number) {
    return UserRepository.delete(id);
  }

  /**
   * ==================== ROLE SERVICE ====================
   */

  static async createRole(data: CreateRoleDTO) {
    // Verify company exists
    const company = await CompanyRepository.findById(data.companyId);
    if (!company) {
      throw new Error(`Company ${data.companyId} not found`);
    }

    // Check if code already exists
    if (await RoleRepository.codeExists(data.code)) {
      throw new Error(`Role code '${data.code}' already exists`);
    }

    return RoleRepository.create({
      company: { connect: { id: data.companyId } },
      name: data.name,
      code: data.code,
      description: data.description,
      hierarchyLevel: data.hierarchyLevel || 50,
      status: data.status || 'active',
    });
  }

  static async getRole(id: number) {
    const role = await RoleRepository.findById(id);
    if (!role) {
      throw new Error(`Role ${id} not found`);
    }
    return role;
  }

  static async listRoles(companyId: number, params: PaginationParams) {
    // Verify company exists
    const company = await CompanyRepository.findById(companyId);
    if (!company) {
      throw new Error(`Company ${companyId} not found`);
    }

    const skip = params.skip || 0;
    const take = params.take || 50;

    return RoleRepository.findByCompany(companyId, skip, take, {
      status: params.status,
      search: params.search,
    });
  }

  static async updateRole(id: number, data: Partial<CreateRoleDTO>) {
    const role = await RoleRepository.findById(id);
    if (!role) {
      throw new Error(`Role ${id} not found`);
    }

    // Check if new code already exists
    if (data.code && data.code !== role.code) {
      if (await RoleRepository.codeExists(data.code, id)) {
        throw new Error(`Role code '${data.code}' already exists`);
      }
    }

    return RoleRepository.update(id, data);
  }

  static async deactivateRole(id: number) {
    const role = await RoleRepository.findById(id);
    if (!role) {
      throw new Error(`Role ${id} not found`);
    }
    return RoleRepository.deactivate(id);
  }

  static async deleteRole(id: number) {
    // Check if role has users
    const userCount = await RoleRepository.findUsersInRole(id);
    if (userCount > 0) {
      throw new Error(`Cannot delete role with assigned users`);
    }

    return RoleRepository.delete(id);
  }
}
