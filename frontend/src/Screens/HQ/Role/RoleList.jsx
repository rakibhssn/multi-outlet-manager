import React, { useCallback, useEffect, useState } from "react";
import { LuPlus, LuShieldCheck } from "react-icons/lu";
import { AnimateButton, StatusComp } from "@/components/custom";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/Screens/Layout/DashboardBlocks";
import useCan from "@/hooks/useCan";
import useNotify from "@/hooks/useNotify";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { plural } from "@/lib/Functions/Common";
import { cn } from "@/lib/utils";
import RoleEditor from "./RoleEditor";
import { ROLE_SECTIONS, roleSourceOf } from "./roleGroups";

function RoleItem({ role, active, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(role.id)}
      className={cn("role-item", active && "role-item-active")}
    >
      <span className="role-item-name">
        {role.isSystem && <LuShieldCheck />}
        {role.name}
        {role.status !== "ACTIVE" && (
          <StatusComp type="INACTIVE" className="role-item-status" />
        )}
      </span>
      <span className="role-item-meta">
        {plural(role.userCount, "account")} · {roleSourceOf(role)}
      </span>
    </button>
  );
}

export default function RoleList() {
  const notify = useNotify();
  const can = useCan();
  const [data, setData] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [creating, setCreating] = useState(false);
  const roles = data?.roles ?? [];
  const selected = roles.find((role) => role.id === selectedId) ?? roles[0];

  const load = useCallback(
    () =>
      notify.load(ApiService.get(API_LINK.Role), {
        errorText: "Failed to load roles",
        onSuccess: (res) => setData(res.data),
      }),
    [notify],
  );

  useEffect(() => {
    load();
  }, [load]);

  const replaceRole = (row) =>
    setData((prev) => ({
      ...prev,
      roles: prev.roles.map((role) => (role.id === row.id ? row : role)),
    }));

  const removeRole = (id) => {
    setData((prev) => ({
      ...prev,
      roles: prev.roles.filter((role) => role.id !== id),
    }));
    setSelectedId(null);
  };

  const createRole = () => {
    setCreating(true);
    notify
      .submit(
        ApiService.post(API_LINK.Role, {
          name: `New role ${roles.filter((role) => role.editable && !role.shared).length + 1}`,
        }),
        {
          errorText: "Failed to create the role",
          onSuccess: (res) => {
            setData((prev) => ({ ...prev, roles: [...prev.roles, res.data] }));
            setSelectedId(res.data.id);
          },
        },
      )
      .finally(() => setCreating(false));
  };

  return (
    <div className="page">
      <PageHeader
        title="Roles"
        subtitle="Decide which pages and actions each role can reach. Accounts pick up these permissions from the role they hold."
      />

      {!data && <Skeleton className="h-96 rounded-lg" />}

      {data && (
        <div className="roles-layout">
          <nav className="roles-list" aria-label="Roles">
            {ROLE_SECTIONS.map((section) => {
              const items = roles.filter(section.match);
              if (!items.length) return null;
              return (
                <div key={section.key} className="roles-section">
                  <span className="roles-section-label">{section.label}</span>
                  {items.map((role) => (
                    <RoleItem
                      key={role.id}
                      role={role}
                      active={role.id === selected?.id}
                      onSelect={setSelectedId}
                    />
                  ))}
                </div>
              );
            })}
            {can("roles.manage") && (
              <AnimateButton
                variant="outline"
                preIcon={LuPlus}
                label="New role"
                loading={creating}
                onClick={createRole}
                className="roles-new"
              />
            )}
          </nav>

          {selected && (
            <RoleEditor
              key={selected.id}
              role={selected}
              groups={data.groups}
              hqOnly={data.hqOnly}
              onSaved={replaceRole}
              onDeleted={removeRole}
            />
          )}
        </div>
      )}
    </div>
  );
}
