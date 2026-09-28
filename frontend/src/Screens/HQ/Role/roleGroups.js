export const roleSourceOf = (role) => {
  if (role.isSystem) return "Built-in";
  if (role.shared) return "Shared";
  return role.company?.name ?? "Company";
};

export const ROLE_SECTIONS = [
  { key: "system", label: "Built-in", match: (role) => role.isSystem },
  {
    key: "shared",
    label: "Shared with every company",
    match: (role) => !role.isSystem && role.shared,
  },
  {
    key: "company",
    label: "Company roles",
    match: (role) => !role.isSystem && !role.shared,
  },
];

export const visibleGroups = (groups, role, hqOnly) =>
  groups
    .map((group) => ({
      ...group,
      permissions: role.isSystem
        ? group.permissions
        : group.permissions.filter(
            (permission) => !hqOnly.includes(permission.key),
          ),
    }))
    .filter((group) => group.permissions.length);

export const sameKeys = (a, b) =>
  a.length === b.length && a.every((key) => b.includes(key));
