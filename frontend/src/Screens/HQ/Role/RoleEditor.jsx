import React, { useState } from "react";
import { LuInfo, LuSave, LuShieldCheck, LuTrash2 } from "react-icons/lu";
import {
  AnimateButton,
  CustomCheckbox,
  CustomSwitch,
  InputField,
} from "@/components/custom";
import useConfirm from "@/hooks/useConfirm";
import useNotify from "@/hooks/useNotify";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { plural } from "@/lib/Functions/Common";
import { sameKeys, visibleGroups } from "./roleGroups";

function RoleNotice({ role }) {
  if (role.isSystem) {
    return (
      <p className="role-notice">
        <LuShieldCheck />
        Super Admin always holds every permission, so it cannot be edited or
        deleted. That is what stops a company locking itself out.
      </p>
    );
  }
  if (!role.editable) {
    return (
      <p className="role-notice">
        <LuInfo />
        This role is shared by every company, so only the developer account can
        change it. Create a company role to adjust access for your outlets.
      </p>
    );
  }
  return null;
}

function PermissionTable({ groups, checked, locked, onToggle }) {
  return (
    <div className="perm-table">
      {groups.map((group) => (
        <div key={group.label} className="perm-group">
          <span className="perm-area">{group.label}</span>
          <div className="perm-row">
            {group.permissions.map((permission) => (
              <CustomCheckbox
                key={permission.key}
                name={permission.key}
                disabled={locked}
                checked={locked || checked.includes(permission.key)}
                onChange={(on) => onToggle(permission.key, on)}
                className="perm-item"
                label={
                  <>
                    {permission.label}
                    <span className="perm-kind">{permission.kind}</span>
                  </>
                }
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function RoleEditor({
  role,
  groups,
  hqOnly,
  onSaved,
  onDeleted,
}) {
  const notify = useNotify();
  const confirm = useConfirm();
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description ?? "");
  const [status, setStatus] = useState(role.status);
  const [permissions, setPermissions] = useState(role.permissions);
  const [saving, setSaving] = useState(false);
  const locked = !role.editable;
  const shownGroups = visibleGroups(groups, role, hqOnly);

  const dirty =
    name !== role.name ||
    description !== (role.description ?? "") ||
    status !== role.status ||
    !sameKeys(permissions, role.permissions);

  const toggle = (key, on) =>
    setPermissions((keys) =>
      on ? [...keys, key] : keys.filter((item) => item !== key),
    );

  const save = () => {
    setSaving(true);
    notify
      .submit(
        ApiService.patch(API_LINK.RoleDetails(role.id), {
          name,
          description,
          status,
          permissions,
        }),
        {
          errorText: "Failed to save the role",
          onSuccess: (res) => onSaved(res.data),
        },
      )
      .finally(() => setSaving(false));
  };

  const askRemove = () =>
    confirm.remove({
      title: `Delete the ${role.name} role?`,
      body: "Nobody holds it, so no one loses access, but the permissions set up here go with it.",
      onConfirm: () =>
        notify.submit(ApiService.delete(API_LINK.RoleDetails(role.id)), {
          errorText: "Failed to delete the role",
          onSuccess: () => {
            confirm.close();
            onDeleted(role.id);
          },
        }),
    });

  return (
    <section className="role-editor">
      <div className="role-toolbar">
        <InputField
          label="Role name"
          value={name}
          disabled={locked}
          onChange={(event) => setName(event.target.value)}
          className="role-name-field"
        />
        <InputField
          label="Description"
          value={description}
          disabled={locked}
          placeholder="What this role is for"
          onChange={(event) => setDescription(event.target.value)}
          className="role-description-field"
        />
        {!locked && (
          <div className="role-toolbar-actions">
            <CustomSwitch
              name="status"
              label="Status"
              onLabel="Active"
              offLabel="Inactive"
              checked={status === "ACTIVE"}
              onChange={(on) => setStatus(on ? "ACTIVE" : "INACTIVE")}
            />
            <AnimateButton
              preIcon={LuSave}
              label="Save role"
              loading={saving}
              disabled={!dirty || !name.trim()}
              onClick={save}
            />
            <AnimateButton
              variant="outline"
              preIcon={LuTrash2}
              label="Delete"
              className="delete__button"
              disabled={role.userCount > 0 || saving}
              title={
                role.userCount > 0
                  ? `${plural(role.userCount, "account")} hold this role. Move them to another role first`
                  : "Delete role"
              }
              onClick={askRemove}
            />
          </div>
        )}
      </div>

      <RoleNotice role={role} />

      <PermissionTable
        groups={shownGroups}
        checked={permissions}
        locked={locked}
        onToggle={toggle}
      />

      {!role.isSystem && (
        <p className="role-footnote">
          Headquarter permissions (companies, outlets, stock, menu editing and
          roles) belong to Super Admin only, so they are not listed here.
        </p>
      )}
    </section>
  );
}
