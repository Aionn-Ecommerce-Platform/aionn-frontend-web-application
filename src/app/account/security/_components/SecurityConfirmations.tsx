"use client";

import { ConfirmDialog } from "@/shared/ui";
import { useTranslation } from "@/hooks";

interface Props {
  revokeOpen: boolean;
  revokeAllOpen: boolean;
  deleteOpen: boolean;
  cancelDeleteOpen: boolean;
  loading: boolean;
  closeRevoke: () => void;
  confirmRevoke: () => void;
  closeRevokeAll: () => void;
  confirmRevokeAll: () => void;
  closeDelete: () => void;
  confirmDelete: () => void;
  closeCancelDelete: () => void;
  confirmCancelDelete: () => void;
}

export function SecurityConfirmations(props: Props) {
  const { t } = useTranslation();
  return (
    <>
      <ConfirmDialog
        isOpen={props.revokeOpen}
        onClose={props.closeRevoke}
        onConfirm={props.confirmRevoke}
        title={t("security.revokeSessionTitle")}
        message={t("security.revokeSessionMessage")}
        confirmLabel={t("security.revoke")}
        loading={props.loading}
      />
      <ConfirmDialog
        isOpen={props.revokeAllOpen}
        onClose={props.closeRevokeAll}
        onConfirm={props.confirmRevokeAll}
        title={t("security.logoutAllTitle")}
        message={t("security.logoutAllMessage")}
        confirmLabel={t("security.logoutAll")}
        loading={props.loading}
      />
      <ConfirmDialog
        isOpen={props.deleteOpen}
        onClose={props.closeDelete}
        onConfirm={props.confirmDelete}
        title={t("security.requestDeletionTitle")}
        message={t("security.requestDeletionMessage")}
        confirmLabel={t("security.requestDeletion")}
        loading={props.loading}
      />
      <ConfirmDialog
        isOpen={props.cancelDeleteOpen}
        onClose={props.closeCancelDelete}
        onConfirm={props.confirmCancelDelete}
        title={t("security.cancelDeletionTitle")}
        message={t("security.cancelDeletionMessage")}
        confirmLabel={t("security.cancelDeletion")}
        loading={props.loading}
      />
    </>
  );
}
