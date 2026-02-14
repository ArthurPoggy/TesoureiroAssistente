const PRIVILEGED_ROLES = ['admin', 'diretor_financeiro'];

const isPrivilegedRole = (role) => PRIVILEGED_ROLES.includes(role);

const isPrivilegedRequest = (req) => isPrivilegedRole(req.user?.role);

module.exports = {
  PRIVILEGED_ROLES,
  isPrivilegedRole,
  isPrivilegedRequest
};
