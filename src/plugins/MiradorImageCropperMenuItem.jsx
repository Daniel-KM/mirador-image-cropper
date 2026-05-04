import React from 'react';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import CropIcon from '@mui/icons-material/Crop';
import { useTranslation } from 'mirador';

export default function MiradorImageCropperMenuItem({
  enabled,
  handleClose,
  updateWindow,
  windowId,
}) {
  const { t } = useTranslation();
  const onClick = () => {
    if (handleClose) handleClose();
    updateWindow(windowId, { imageCropperEnabled: !enabled });
  };
  return (
    <MenuItem onClick={onClick}>
      <ListItemIcon>
        <CropIcon color={enabled ? 'primary' : undefined} />
      </ListItemIcon>
      <ListItemText>
        {t('imageCropper_toggle')}
      </ListItemText>
    </MenuItem>
  );
}
