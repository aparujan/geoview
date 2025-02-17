/* eslint-disable react/require-default-props */
import React, { useEffect, useState, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import Grid from '@mui/material/Grid';
import {
  Box,
  Collapse,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CloseIcon,
  TodoIcon,
  Tooltip,
  VisibilityIcon,
  VisibilityOffIcon,
  IconButton,
  Menu,
  MenuItem,
  MoreVertIcon,
  ExpandMoreIcon,
  ExpandLessIcon,
  OpacityIcon,
  SliderBase,
} from '../../../ui';
import {
  api,
  AbstractGeoViewLayer,
  TypeClassBreakStyleConfig,
  TypeListOfLayerEntryConfig,
  TypeUniqueValueStyleConfig,
  TypeLayerEntryConfig,
  TypeDisplayLanguage,
  MapContext,
} from '../../../app';
import { LegendIconList } from './legend-icon-list';
import { isVectorLegend, isWmsLegend } from '../../../geo/layer/geoview-layers/abstract-geoview-layers';
import { isClassBreakStyleConfig, isUniqueValueStyleConfig, layerEntryIsGroupLayer } from '../../../geo/map/map-schema-types';

const sxClasses = {
  expandableGroup: {
    paddingRight: 0,
    paddingLeft: 28,
  },
  expandableIconContainer: {
    paddingLeft: 10,
  },
  legendIcon: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: 24,
    height: 24,
    background: '#fff',
  },
  legendIconTransparent: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: 24,
    height: 24,
  },
  maxIconImg: {
    maxWidth: 24,
    maxHeight: 24,
  },
  iconPreview: {
    padding: 0,
    borderRadius: 0,
    border: '1px solid',
    borderColor: 'grey.600',
    boxShadow: 'rgb(0 0 0 / 20%) 0px 3px 1px -2px, rgb(0 0 0 / 14%) 0px 2px 2px 0px, rgb(0 0 0 / 12%) 0px 1px 5px 0px',
  },
  iconImg: {
    padding: 3,
    borderRadius: 0,
    border: '1px solid',
    borderColor: 'grey.600',
    boxShadow: 'rgb(0 0 0 / 20%) 0px 3px 1px -2px, rgb(0 0 0 / 14%) 0px 2px 2px 0px, rgb(0 0 0 / 12%) 0px 1px 5px 0px',
    background: '#fff',
  },
  iconPreviewHoverable: {
    left: -30,
    top: -2,
    padding: 0,
    borderRadius: 0,
    border: '1px solid',
    borderColor: 'grey.600',
    boxShadow: 'rgb(0 0 0 / 20%) 0px 3px 1px -2px, rgb(0 0 0 / 14%) 0px 2px 2px 0px, rgb(0 0 0 / 12%) 0px 1px 5px 0px',
    transition: 'transform .3s ease-in-out',
    '&:hover': {
      transform: 'rotate(-18deg) translateX(-8px)',
    },
  },
  iconPreviewStacked: {
    padding: 0,
    borderRadius: 0,
    border: '1px solid',
    borderColor: 'grey.600',
    boxShadow: 'rgb(0 0 0 / 20%) 0px 3px 1px -2px, rgb(0 0 0 / 14%) 0px 2px 2px 0px, rgb(0 0 0 / 12%) 0px 1px 5px 0px',
    background: '#fff',
  },
  solidBackground: {
    background: '#fff',
  },
  opacityMenu: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
};

export interface TypeLegendItemProps {
  layerId: string;
  geoviewLayerInstance: AbstractGeoViewLayer;
  subLayerId?: string;
  layerConfigEntry?: TypeLayerEntryConfig;
  isRemoveable?: boolean;
  canSetOpacity?: boolean;
  isParentVisible?: boolean;
  toggleParentVisible?: () => void;
  expandAll?: boolean;
  hideAll?: boolean;
}

/**
 * Legend Item for a Legend list
 *
 * @returns {JSX.Element} the legend list item
 */
export function LegendItem(props: TypeLegendItemProps): JSX.Element {
  const {
    layerId,
    geoviewLayerInstance,
    subLayerId,
    layerConfigEntry,
    isRemoveable,
    canSetOpacity,
    isParentVisible,
    toggleParentVisible,
    expandAll,
    hideAll,
  } = props;

  const { t, i18n } = useTranslation<string>();

  const mapConfig = useContext(MapContext);
  const { mapId } = mapConfig;

  const [isChecked, setChecked] = useState(true);
  const [isOpacityOpen, setOpacityOpen] = useState(false);
  const [isGroupOpen, setGroupOpen] = useState(false);
  const [isLegendOpen, setLegendOpen] = useState(false);
  const [groupItems, setGroupItems] = useState<TypeListOfLayerEntryConfig>([]);
  const [iconType, setIconType] = useState<string | null>(null);
  const [iconImg, setIconImg] = useState<string | null>(null);
  const [iconImgStacked, setIconImgStacked] = useState<string | null>(null);
  const [iconList, setIconList] = useState<string[] | null>(null);
  const [labelList, setLabelList] = useState<string[] | null>(null);
  const [layerName, setLayerName] = useState<string>('');
  const [menuAnchorElement, setMenuAnchorElement] = useState<null | HTMLElement>(null);
  const [opacity, setOpacity] = useState<number>(1);

  const menuOpen = Boolean(menuAnchorElement);

  const getGroupsDetails = (): boolean => {
    let isGroup = false;
    if (layerConfigEntry) {
      if (layerEntryIsGroupLayer(layerConfigEntry)) {
        setGroupItems(layerConfigEntry.listOfLayerEntryConfig);
        isGroup = true;
      }
    } else if (
      geoviewLayerInstance?.listOfLayerEntryConfig &&
      (geoviewLayerInstance?.listOfLayerEntryConfig.length > 1 || layerEntryIsGroupLayer(geoviewLayerInstance.listOfLayerEntryConfig[0]))
    ) {
      setGroupItems(geoviewLayerInstance.listOfLayerEntryConfig);
      isGroup = true;
    }
    return isGroup;
  };

  const getLegendDetails = () => {
    geoviewLayerInstance?.getLegend(subLayerId).then((layerLegend) => {
      if (layerLegend) {
        // WMS layers just return a string
        if (isWmsLegend(layerLegend)) {
          setIconType('simple');
          setIconImg(layerLegend.legend.toDataURL());
        } else if (isVectorLegend(layerLegend)) {
          Object.entries(layerLegend.legend).forEach(([, styleRepresentation]) => {
            if (styleRepresentation.arrayOfCanvas) {
              setIconType('list');
              const iconImageList = (styleRepresentation.arrayOfCanvas as HTMLCanvasElement[]).map((canvas) => {
                return canvas.toDataURL();
              });
              if (iconImageList.length > 0) setIconImg(iconImageList[0]);
              if (iconImageList.length > 1) setIconImgStacked(iconImageList[1]);
              if (styleRepresentation.defaultCanvas) iconImageList.push(styleRepresentation.defaultCanvas.toDataURL());
              setIconList(iconImageList);
              if (layerLegend.styleConfig) {
                Object.entries(layerLegend.styleConfig).forEach(([, styleSettings]) => {
                  if (isClassBreakStyleConfig(styleSettings)) {
                    const iconLabelList = (styleSettings as TypeClassBreakStyleConfig).classBreakStyleInfo.map((styleInfo) => {
                      return styleInfo.label;
                    });
                    if (styleRepresentation.defaultCanvas) iconLabelList.push((styleSettings as TypeClassBreakStyleConfig).defaultLabel!);
                    setLabelList(iconLabelList);
                  }
                  if (isUniqueValueStyleConfig(styleSettings)) {
                    const iconLabelList = (styleSettings as TypeUniqueValueStyleConfig).uniqueValueStyleInfo.map((styleInfo) => {
                      return styleInfo.label;
                    });
                    if (styleRepresentation.defaultCanvas) iconLabelList.push((styleSettings as TypeUniqueValueStyleConfig).defaultLabel!);
                    setLabelList(iconLabelList);
                  }
                });
              }
            } else {
              setIconType('simple');
              setIconImg((styleRepresentation.defaultCanvas as HTMLCanvasElement).toDataURL());
            }
          });
        } else {
          // eslint-disable-next-line no-console
          console.log(`${layerId} - UNHANDLED LEGEND TYPE`);
        }
      } else {
        // eslint-disable-next-line no-console
        console.log(`${layerId} - NULL LAYER DATA`);
      }
    });
  };

  const getLayerName = () => {
    if (layerConfigEntry) {
      if (layerConfigEntry.layerName && layerConfigEntry.layerName[i18n.language as TypeDisplayLanguage]) {
        setLayerName(layerConfigEntry.layerName[i18n.language as TypeDisplayLanguage] ?? '');
      } else if (t('legend.unknown')) {
        setLayerName(t('legend.unknown'));
      }
    } else if (geoviewLayerInstance && geoviewLayerInstance.geoviewLayerName[i18n.language as TypeDisplayLanguage]) {
      setLayerName(geoviewLayerInstance.geoviewLayerName[i18n.language as TypeDisplayLanguage] ?? '');
    } else if (t('legend.unknown')) {
      setLayerName(t('legend.unknown'));
    }
  };

  useEffect(() => {
    getLayerName();
    const isGroup = getGroupsDetails();
    if (!isGroup) {
      getLegendDetails();
    }
    setOpacity(geoviewLayerInstance.getOpacity() ?? 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (expandAll !== undefined) setGroupOpen(expandAll);
  }, [expandAll]);

  useEffect(() => {
    if (hideAll !== undefined) setChecked(!hideAll);
  }, [hideAll]);

  useEffect(() => {
    if (layerConfigEntry) {
      if (isParentVisible && isChecked) {
        geoviewLayerInstance.setVisible(true, layerConfigEntry);
      } else {
        geoviewLayerInstance.setVisible(false, layerConfigEntry);
      }
    } else {
      // parent layer with no sub layers
      geoviewLayerInstance.setVisible(isChecked);
    }
  }, [isParentVisible, isChecked, layerConfigEntry, geoviewLayerInstance]);

  /**
   * Handle expand/shrink of layer groups.
   */
  const handleExpandGroupClick = () => {
    setGroupOpen(!isGroupOpen);
  };

  /**
   * Handle expand/shrink of legends.
   */
  const handleLegendClick = () => {
    setLegendOpen(!isLegendOpen);
  };

  /**
   * Handle view/hide layers.
   */
  const handleToggleLayer = () => {
    if (isParentVisible !== undefined) {
      if (toggleParentVisible !== undefined && isParentVisible === false) {
        toggleParentVisible();
        if (!isChecked) setChecked(!isChecked);
        return;
      }
    }
    setChecked(!isChecked);
  };

  const handleMoreClick = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorElement(event.currentTarget);
  };
  const handleCloseMenu = () => {
    setMenuAnchorElement(null);
  };
  const handleRemoveLayer = () => {
    api.map(mapId).layer.removeGeoviewLayer(geoviewLayerInstance);
    // NOTE: parent component needs to deal with removing this legend-item when recieving the layer remove event
    handleCloseMenu();
  };
  const handleOpacityOpen = () => {
    setOpacityOpen(!isOpacityOpen);
    handleCloseMenu();
  };
  const handleSetOpacity = (opacityValue: number | number[]) => {
    if (subLayerId) geoviewLayerInstance.setOpacity((opacityValue as number) / 100, subLayerId);
    else geoviewLayerInstance.setOpacity((opacityValue as number) / 100);
  };

  return (
    <Grid item sm={12} md={subLayerId ? 12 : 6} lg={subLayerId ? 12 : 4}>
      <ListItem>
        <ListItemButton>
          <ListItemIcon>
            {groupItems.length > 0 && (
              <IconButton color="primary" onClick={handleExpandGroupClick}>
                {isGroupOpen ? <ExpandMoreIcon /> : <ExpandLessIcon />}
              </IconButton>
            )}
            {isLegendOpen && (
              <IconButton sx={sxClasses.iconPreview} color="primary" size="small" onClick={handleLegendClick}>
                <CloseIcon />
              </IconButton>
            )}
            {iconType === 'simple' && iconImg !== null && !isLegendOpen && (
              <IconButton sx={sxClasses.iconPreview} color="primary" size="small" onClick={handleLegendClick}>
                <Box sx={sxClasses.legendIcon}>
                  <img alt="icon" src={iconImg} style={sxClasses.maxIconImg} />
                </Box>
              </IconButton>
            )}
            {iconType === 'list' && !isLegendOpen && (
              <Tooltip title={t('legend.expand_legend')} placement="top" enterDelay={1000}>
                <Box>
                  <IconButton sx={sxClasses.iconPreviewStacked} color="primary" size="small">
                    <Box sx={sxClasses.legendIconTransparent}>
                      {iconImgStacked && <img alt="icon" src={iconImgStacked} style={sxClasses.maxIconImg} />}
                    </Box>
                  </IconButton>
                  <IconButton sx={sxClasses.iconPreviewHoverable} color="primary" size="small" onClick={handleLegendClick}>
                    <Box sx={sxClasses.legendIcon}>{iconImg && <img alt="icon" src={iconImg} style={sxClasses.maxIconImg} />}</Box>
                  </IconButton>
                </Box>
              </Tooltip>
            )}
            {groupItems.length === 0 && !iconType && !isLegendOpen && (
              <IconButton sx={sxClasses.iconPreview} color="primary" size="small" onClick={handleLegendClick}>
                <TodoIcon />
              </IconButton>
            )}
          </ListItemIcon>
          <Tooltip title={layerName} placement="top" enterDelay={1000}>
            <ListItemText primary={layerName} onClick={handleExpandGroupClick} />
          </Tooltip>
          <ListItemIcon>
            {(isRemoveable || (canSetOpacity && groupItems.length === 0)) && (
              <IconButton onClick={handleMoreClick}>
                <MoreVertIcon />
              </IconButton>
            )}
            <IconButton color="primary" onClick={() => handleToggleLayer()}>
              {(() => {
                if (isParentVisible === false) return <VisibilityOffIcon />;
                if (isChecked) return <VisibilityIcon />;
                return <VisibilityOffIcon />;
              })()}
            </IconButton>
          </ListItemIcon>
        </ListItemButton>
      </ListItem>
      <Menu anchorEl={menuAnchorElement} open={menuOpen} onClose={handleCloseMenu}>
        {/* Add more layer options here - zoom to, reorder */}
        {isRemoveable && <MenuItem onClick={handleRemoveLayer}>{t('legend.remove_layer')}</MenuItem>}
        {canSetOpacity && groupItems.length === 0 && <MenuItem onClick={handleOpacityOpen}>{t('legend.opacity')}</MenuItem>}
      </Menu>
      <Collapse in={isOpacityOpen} timeout="auto">
        <Box sx={sxClasses.opacityMenu}>
          <Tooltip title={t('legend.opacity')}>
            <OpacityIcon />
          </Tooltip>
          <SliderBase min={0} max={100} value={opacity * 100} customOnChange={handleSetOpacity} />
          <IconButton color="primary" onClick={() => setOpacityOpen(!isOpacityOpen)}>
            <CloseIcon />
          </IconButton>
        </Box>
      </Collapse>
      <Collapse in={isLegendOpen} timeout={iconType === 'list' ? { enter: 800, exit: 800 } : 'auto'}>
        <Box>
          <Box sx={sxClasses.expandableIconContainer}>
            {iconType === 'simple' && iconImg !== null && (
              <img alt="" style={{ ...sxClasses.solidBackground, ...sxClasses.iconImg }} src={iconImg} />
            )}
            {iconType === 'list' && iconList !== null && labelList !== null && (
              <LegendIconList iconImages={iconList} iconLabels={labelList} />
            )}
          </Box>
        </Box>
      </Collapse>
      <Collapse in={isGroupOpen} timeout="auto">
        <Box>
          <Box sx={sxClasses.expandableIconContainer}>
            {groupItems.map((subItem) => (
              <LegendItem
                key={`sub-${subItem.layerId}`}
                layerId={layerId}
                geoviewLayerInstance={geoviewLayerInstance}
                subLayerId={subLayerId ? `${subLayerId}/${subItem.layerId}` : `${layerId}/${subItem.layerId}`}
                layerConfigEntry={subItem}
                isParentVisible={isParentVisible === false ? false : isChecked}
                canSetOpacity={canSetOpacity}
                toggleParentVisible={handleToggleLayer}
                expandAll={expandAll}
                hideAll={hideAll}
              />
            ))}
          </Box>
        </Box>
      </Collapse>
    </Grid>
  );
}
