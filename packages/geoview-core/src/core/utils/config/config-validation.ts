/* eslint-disable no-console, no-underscore-dangle, no-param-reassign */
import Ajv from 'ajv';

import defaultsDeep from 'lodash/defaultsDeep';
import { generateId } from '../utilities';

import schema from '../../../../schema.json';
import { TypeBasemapId, TypeBasemapOptions, VALID_BASEMAP_ID } from '../../../geo/layer/basemap/basemap-types';
import { geoviewEntryIsWMS } from '../../../geo/layer/geoview-layers/raster/wms';
import { geoviewEntryIsXYZTiles } from '../../../geo/layer/geoview-layers/raster/xyz-tiles';
import { geoviewEntryIsEsriDynamic } from '../../../geo/layer/geoview-layers/raster/esri-dynamic';
import { geoviewEntryIsEsriFeature } from '../../../geo/layer/geoview-layers/vector/esri-feature';
import { geoviewEntryIsWFS } from '../../../geo/layer/geoview-layers/vector/wfs';
import { geoviewEntryIsOgcFeature } from '../../../geo/layer/geoview-layers/vector/ogc-feature';
import { geoviewEntryIsGeoJSON } from '../../../geo/layer/geoview-layers/vector/geojson';
import { geoviewEntryIsGeoPackage } from '../../../geo/layer/geoview-layers/vector/geopackage';
import { geoviewEntryIsGeocore } from '../../../geo/layer/other/geocore';
import {
  layerEntryIsGroupLayer,
  TypeGeoviewLayerConfig,
  TypeDisplayLanguage,
  TypeLayerEntryConfig,
  TypeLocalizedString,
  TypeValidMapProjectionCodes,
  TypeValidVersions,
  TypeListOfLayerEntryConfig,
  TypeLayerGroupEntryConfig,
  VALID_DISPLAY_LANGUAGE,
  VALID_PROJECTION_CODES,
  VALID_VERSIONS,
  TypeListOfGeoviewLayerConfig,
  TypeListOfLocalizedLanguages,
  TypeVectorLayerEntryConfig,
  TypeImageLayerEntryConfig,
} from '../../../geo/map/map-schema-types';
import { TypeMapFeaturesConfig } from '../../types/global-types';
import { api } from '../../../app';
import { snackbarMessagePayload } from '../../../api/events/payloads/snackbar-message-payload';
import { EVENT_NAMES } from '../../../api/events/event-types';
import { Layer } from '../../../geo/layer/layer';

// ******************************************************************************************************************************
// ******************************************************************************************************************************
/** *****************************************************************************************************************************
 * A class to define the default values of a GeoView map configuration and validation methods for the map config attributes.
 * @exports
 * @class DefaultConfig
 */
// ******************************************************************************************************************************
export class ConfigValidation {
  /** The map ID associated to the configuration. If it is undefined, a unique value will be generated and assign to it. */
  private _mapId: string;

  /** The triggerReadyCallback flag associated to the configuration. Default value is false. */
  private _triggerReadyCallback: boolean;

  /** The language that will be used to display the GeoView layer. */
  private _displayLanguage: TypeDisplayLanguage;

  /** default configuration if provided configuration is missing or wrong */
  private _defaultMapFeaturesConfig: TypeMapFeaturesConfig = {
    map: {
      interaction: 'dynamic',
      viewSettings: {
        zoom: 4,
        center: [-100, 60],
        projection: 3978,
        enableRotation: true,
        rotation: 0,
      },
      basemapOptions: {
        basemapId: 'transport',
        shaded: true,
        labeled: true,
      },
      listOfGeoviewLayerConfig: [],
      extraOptions: {},
    },
    theme: 'dark',
    components: ['app-bar', 'nav-bar', 'north-arrow', 'overview-map'],
    corePackages: [],
    displayLanguage: 'en',
    triggerReadyCallback: false,
    suportedLanguages: ['en', 'fr'],
    versionUsed: '1.0',
  };

  // valid basemap ids
  private _basemapId: Record<TypeValidMapProjectionCodes, TypeBasemapId[]> = {
    3857: VALID_BASEMAP_ID,
    3978: VALID_BASEMAP_ID,
  };

  // valid shaded basemap values for each projection
  private _basemapShaded: Record<TypeValidMapProjectionCodes, boolean[]> = {
    3857: [true, false],
    3978: [true, false],
  };

  // valid labeled basemap values for each projection
  private _basemaplabeled: Record<TypeValidMapProjectionCodes, boolean[]> = {
    3857: [true, false],
    3978: [true, false],
  };

  // valid center levels from each projection
  private _center: Record<TypeValidMapProjectionCodes, Record<string, number[]>> = {
    3857: { lat: [-90, 90], long: [-180, 180] },
    3978: { lat: [40, 90], long: [-140, 40] },
  };

  /** ***************************************************************************************************************************
   * The ConfigValidation class constructor used to instanciate an object of this type.
   *
   * @returns {ConfigValidation} An ConfigValidation instance.
   */
  constructor() {
    this._mapId = generateId();
    this._displayLanguage = this._defaultMapFeaturesConfig.displayLanguage!;
    this._triggerReadyCallback = this._defaultMapFeaturesConfig.triggerReadyCallback!;
  }

  /** ***************************************************************************************************************************
   * Get map features configuration object.
   *
   * @returns {TypeMapFeaturesConfig} The map features configuration.
   */
  get defaultMapFeaturesConfig(): TypeMapFeaturesConfig {
    return this._defaultMapFeaturesConfig;
  }

  /** ***************************************************************************************************************************
   * Get mapId value.
   *
   * @returns {string} The ID of the Geoview map.
   */
  get mapId(): string {
    return this._mapId;
  }

  /** ***************************************************************************************************************************
   * Set mapId value.
   * @param {string} mapId The ID of the Geoview map.
   */
  set mapId(mapId: string) {
    this._mapId = mapId;
  }

  /** ***************************************************************************************************************************
   * Get triggerReadyCallback value.
   *
   * @returns {boolean} The triggerReadyCallback flag of the Geoview map.
   */
  get triggerReadyCallback(): boolean {
    return this._triggerReadyCallback;
  }

  /** ***************************************************************************************************************************
   * Set triggerReadyCallback value.
   * @param {boolean} triggerReadyCallback The value to assign to the triggerReadyCallback flag for the Geoview map.
   */
  set triggerReadyCallback(triggerReadyCallback: boolean) {
    this._triggerReadyCallback = triggerReadyCallback;
  }

  /** ***************************************************************************************************************************
   * Get displayLanguage value.
   *
   * @returns {TypeDisplayLanguage} The display language of the Geoview map.
   */
  get displayLanguage(): TypeDisplayLanguage {
    return this._displayLanguage;
  }

  /** ***************************************************************************************************************************
   * Set displayLanguage value.
   * @param {TypeDisplayLanguage} displayLanguage The display language of the Geoview map.
   */
  set displayLanguage(displayLanguage: TypeDisplayLanguage) {
    this._displayLanguage = this.validateDisplayLanguage(displayLanguage);
  }

  /** ***************************************************************************************************************************
   * Validate basemap options.
   * @param {TypeValidMapProjectionCodes} projection The projection code of the basemap.
   * @param {TypeBasemapOptions} basemapOptions The basemap options to validate.
   *
   * @returns {TypeBasemapOptions} A valid basemap options.
   */
  validateBasemap(projection?: TypeValidMapProjectionCodes, basemapOptions?: TypeBasemapOptions): TypeBasemapOptions {
    if (projection && basemapOptions) {
      const basemapId = this._basemapId[projection].includes(basemapOptions.basemapId)
        ? basemapOptions.basemapId
        : this._defaultMapFeaturesConfig.map.basemapOptions.basemapId;
      const shaded = this._basemapShaded[projection].includes(basemapOptions.shaded)
        ? basemapOptions.shaded
        : this._defaultMapFeaturesConfig.map.basemapOptions.shaded;
      const labeled = this._basemaplabeled[projection].includes(basemapOptions.labeled)
        ? basemapOptions.labeled
        : this._defaultMapFeaturesConfig.map.basemapOptions.labeled;

      return { basemapId, shaded, labeled };
    }
    return this._defaultMapFeaturesConfig.map.basemapOptions;
  }

  /** ***************************************************************************************************************************
   * Validate map version.
   * @param {TypeValidVersions} version The version to validate.
   *
   * @returns {TypeValidVersions} A valid version.
   */
  validateVersion(version?: TypeValidVersions): TypeValidVersions {
    return version && VALID_VERSIONS.includes(version) ? version : this._defaultMapFeaturesConfig.versionUsed!;
  }

  /** ***************************************************************************************************************************
   * Validate map config language.
   * @param {TypeDisplayLanguage} language The language to validate.
   *
   * @returns {TypeDisplayLanguage} A valid language.
   */
  validateDisplayLanguage(language?: TypeDisplayLanguage): TypeDisplayLanguage {
    if (language && VALID_DISPLAY_LANGUAGE.includes(language)) return language;

    console.log(
      `- Map: ${this.mapId} - Invalid display language code ${language} replaced by ${this._defaultMapFeaturesConfig.displayLanguage} -`
    );
    return this._defaultMapFeaturesConfig.displayLanguage!;
  }

  /** ***************************************************************************************************************************
   * Validate zoom level.
   * @param {number} zoom The zoom level to validate.
   *
   * @returns {number} A valid zoom level.
   */
  private validateZoom(zoom?: number): number {
    return zoom && !Number.isNaN(zoom) && zoom >= 0 && zoom <= 18 ? zoom : this._defaultMapFeaturesConfig.map.viewSettings.zoom;
  }

  /** ***************************************************************************************************************************
   * Validate min zoom level.
   * @param {number} zoom The zoom level to validate.
   *
   * @returns {number} A valid zoom level.
   */
  private validateMinZoom(zoom?: number): number | undefined {
    return zoom && !Number.isNaN(zoom) && zoom >= 0 && zoom <= 18 ? zoom : undefined;
  }

  /** ***************************************************************************************************************************
   * Validate max zoom level.
   * @param {number} zoom The zoom level to validate.
   *
   * @returns {number} A valid zoom level.
   */
  private validateMaxZoom(zoom?: number): number | undefined {
    return zoom && !Number.isNaN(zoom) && zoom >= 0 && zoom <= 18 ? zoom : undefined;
  }

  /** ***************************************************************************************************************************
   * Validate projection.
   * @param {TypeValidMapProjectionCodes} projection The projection to validate.
   *
   * @returns {TypeValidMapProjectionCodes} A valid projection.
   */
  private validateProjection(projection?: TypeValidMapProjectionCodes): TypeValidMapProjectionCodes {
    return projection && VALID_PROJECTION_CODES.includes(projection)
      ? projection
      : this._defaultMapFeaturesConfig.map.viewSettings.projection;
  }

  /** ***************************************************************************************************************************
   * Validate the center.
   * @param {TypeValidMapProjectionCodes} projection The projection used by the map.
   * @param {[number, number]} center The map center to valdate.
   *
   * @returns {[number, number]} A valid map center.
   */
  private validateCenter(projection?: TypeValidMapProjectionCodes, center?: [number, number]): [number, number] {
    if (projection && center) {
      const xVal = Number(center[0]);
      const yVal = Number(center[1]);

      const x =
        !Number.isNaN(xVal) && xVal > this._center[projection].long[0] && xVal < this._center[projection].long[1]
          ? xVal
          : this._defaultMapFeaturesConfig.map.viewSettings.center[0];
      const y =
        !Number.isNaN(yVal) && yVal > this._center[projection].lat[0] && yVal < this._center[projection].lat[1]
          ? yVal
          : this._defaultMapFeaturesConfig.map.viewSettings.center[1];

      return [x, y];
    }
    return this._defaultMapFeaturesConfig.map.viewSettings.center;
  }

  /** ***************************************************************************************************************************
   * Validate the map features configuration.
   * @param {TypeMapFeaturesConfig} mapFeaturesConfigToValidate The map features configuration to validate.
   *
   * @returns {TypeMapFeaturesConfig} A valid map features configuration.
   */
  validateMapConfigAgainstSchema(mapFeaturesConfigToValidate?: TypeMapFeaturesConfig): TypeMapFeaturesConfig {
    let validMapFeaturesConfig: TypeMapFeaturesConfig;

    // if config has been provided by user then validate it
    if (mapFeaturesConfigToValidate) {
      // if the list of layer doesn't exist, add the key with empty array for the map to trigger
      if (mapFeaturesConfigToValidate.map.listOfGeoviewLayerConfig === undefined)
        mapFeaturesConfigToValidate.map.listOfGeoviewLayerConfig = [];

      // create a validator object
      const validator = new Ajv({
        strict: false,
        allErrors: true,
      });

      // initialize validator with schema file
      const validate = validator.compile(schema);

      // validate configuration
      const valid = validate({ ...mapFeaturesConfigToValidate });

      if (!valid && validate.errors && validate.errors.length) {
        for (let j = 0; j < validate.errors.length; j += 1) {
          const error = validate.errors[j];
          const { instancePath } = error;
          const path = instancePath.split('/');
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let node: any = mapFeaturesConfigToValidate;
          for (let i = 1; i < path.length; i += 1) {
            node = node[path[i]];
          }
          console.log(this.mapId, error);
          console.log(this.mapId, node);
        }

        setTimeout(() => {
          const errorMessage = `- Map ${this.mapId}: A schema error was found, check the console to see what is wrong.`;

          api.event.emit(
            snackbarMessagePayload(EVENT_NAMES.SNACKBAR.EVENT_SNACKBAR_OPEN, this.mapId, {
              type: 'string',
              value: errorMessage,
            })
          );
        }, 2000);

        validMapFeaturesConfig = {
          ...this.adjustMapConfiguration(mapFeaturesConfigToValidate),
          mapId: this.mapId,
          displayLanguage: this._displayLanguage as TypeDisplayLanguage,
        };
      } else {
        validMapFeaturesConfig = {
          ...this.adjustMapConfiguration(mapFeaturesConfigToValidate),
          mapId: this.mapId,
          displayLanguage: this._displayLanguage as TypeDisplayLanguage,
        };
      }
    } else {
      validMapFeaturesConfig = {
        ...this._defaultMapFeaturesConfig,
        mapId: this.mapId,
        displayLanguage: this._displayLanguage as TypeDisplayLanguage,
      };
    }
    this.processLocalizedString(validMapFeaturesConfig.suportedLanguages, validMapFeaturesConfig.map.listOfGeoviewLayerConfig);
    this.doExtraValidation(validMapFeaturesConfig.map.listOfGeoviewLayerConfig);

    return validMapFeaturesConfig;
  }

  /** ***************************************************************************************************************************
   * Validate and adjust the list of GeoView layer configuration.
   * @param {TypeListOfLocalizedLanguages} suportedLanguages The list of supported languages.
   * @param {TypeListOfGeoviewLayerConfig} listOfGeoviewLayerConfig The list of GeoView layer configuration to adjust and
   * validate.
   */
  validateListOfGeoviewLayerConfig(
    suportedLanguages: TypeListOfLocalizedLanguages,
    listOfGeoviewLayerConfig?: TypeListOfGeoviewLayerConfig
  ): void {
    this.processLocalizedString(suportedLanguages, listOfGeoviewLayerConfig);
    this.doExtraValidation(listOfGeoviewLayerConfig);
  }

  /** ***************************************************************************************************************************
   * Do extra validation that schema can not do.
   * @param {TypeListOfGeoviewLayerConfig} listOfGeoviewLayerConfig The list of GeoView layer configuration to adjust and
   * validate.
   */
  private doExtraValidation(listOfGeoviewLayerConfig?: TypeListOfGeoviewLayerConfig) {
    if (listOfGeoviewLayerConfig) {
      listOfGeoviewLayerConfig.forEach((geoviewLayerConfig) => {
        switch (geoviewLayerConfig.geoviewLayerType) {
          case 'GeoJSON':
            this.processLayerEntryConfig(geoviewLayerConfig, geoviewLayerConfig, geoviewLayerConfig.listOfLayerEntryConfig);
            break;
          case 'esriDynamic':
            this.metadataAccessPathIsMandatory(geoviewLayerConfig);
            this.processLayerEntryConfig(geoviewLayerConfig, geoviewLayerConfig, geoviewLayerConfig.listOfLayerEntryConfig);
            break;
          case 'esriFeature':
            this.metadataAccessPathIsMandatory(geoviewLayerConfig);
            this.processLayerEntryConfig(geoviewLayerConfig, geoviewLayerConfig, geoviewLayerConfig.listOfLayerEntryConfig);
            break;
          case 'geoCore':
            this.processLayerEntryConfig(geoviewLayerConfig, geoviewLayerConfig, geoviewLayerConfig.listOfLayerEntryConfig);
            break;
          case 'GeoPackage':
            this.processLayerEntryConfig(geoviewLayerConfig, geoviewLayerConfig, geoviewLayerConfig.listOfLayerEntryConfig);
            break;
          case 'xyzTiles':
            this.processLayerEntryConfig(geoviewLayerConfig, geoviewLayerConfig, geoviewLayerConfig.listOfLayerEntryConfig);
            break;
          case 'ogcFeature':
            this.metadataAccessPathIsMandatory(geoviewLayerConfig);
            this.processLayerEntryConfig(geoviewLayerConfig, geoviewLayerConfig, geoviewLayerConfig.listOfLayerEntryConfig);
            break;
          case 'ogcWfs':
            this.metadataAccessPathIsMandatory(geoviewLayerConfig);
            this.processLayerEntryConfig(geoviewLayerConfig, geoviewLayerConfig, geoviewLayerConfig.listOfLayerEntryConfig);
            break;
          case 'ogcWms':
            this.metadataAccessPathIsMandatory(geoviewLayerConfig);
            this.processLayerEntryConfig(geoviewLayerConfig, geoviewLayerConfig, geoviewLayerConfig.listOfLayerEntryConfig);
            break;
          default:
            throw new Error('Your not supposed to end here. There is a problem with the schema validator.');
            break;
        }
      });
    }
  }

  /** ***************************************************************************************************************************
   * Verify that the metadataAccessPath has a value.
   * @param {TypeGeoviewLayerConfig} geoviewLayerConfig The GeoView layer configuration to validate.
   */
  private metadataAccessPathIsMandatory(geoviewLayerConfig: TypeGeoviewLayerConfig) {
    if (!geoviewLayerConfig.metadataAccessPath) {
      throw new Error(
        `metadataAccessPath is mandatory for GeoView layer ${geoviewLayerConfig.geoviewLayerId} of type ${geoviewLayerConfig.geoviewLayerType}.`
      );
    }
  }

  /** ***************************************************************************************************************************
   * Process recursively the layer entries to create layers and layer groups.
   * @param {TypeGeoviewLayerConfig} rootLayerConfig The GeoView layer configuration to adjust and validate.
   * @param {TypeGeoviewLayerConfig | TypeLayerGroupEntryConfig} parentLayerConfig The parent layer configuration of all the
   * layer entry configurations found in the list of layer entries.
   * @param {TypeListOfLayerEntryConfig} listOfLayerEntryConfig The list of layer entry configurations to process.
   */
  private processLayerEntryConfig(
    rootLayerConfig: TypeGeoviewLayerConfig,
    parentLayerConfig: TypeGeoviewLayerConfig | TypeLayerGroupEntryConfig,
    listOfLayerEntryConfig: TypeListOfLayerEntryConfig
  ) {
    listOfLayerEntryConfig.forEach((layerEntryConfig: TypeLayerEntryConfig) => {
      // links the entry to its root GeoView layer.
      layerEntryConfig.geoviewRootLayer = rootLayerConfig;
      // links the entry to its parent layer configuration.
      layerEntryConfig.parentLayerConfig = parentLayerConfig;
      // layerEntryConfig.initialSettings attributes that are not defined inherits parent layer settings that are defined.
      layerEntryConfig.initialSettings = defaultsDeep(layerEntryConfig.initialSettings, layerEntryConfig.parentLayerConfig.initialSettings);
      if (layerEntryIsGroupLayer(layerEntryConfig))
        this.processLayerEntryConfig(rootLayerConfig, layerEntryConfig, layerEntryConfig.listOfLayerEntryConfig);
      else if (geoviewEntryIsWMS(layerEntryConfig)) {
        // Value for layerEntryConfig.entryType can only be raster
        if (!layerEntryConfig.entryType) layerEntryConfig.entryType = 'raster';
        // if layerEntryConfig.source.dataAccessPath is undefined, the metadataAccessPath defined on the root is used.
        if (!layerEntryConfig.source) layerEntryConfig.source = {};
        if (!layerEntryConfig.source.dataAccessPath) {
          // When the dataAccessPath is undefined and the metadataAccessPath ends with ".xml", the dataAccessPath is temporarilly
          // set to '' and will be filled in the getServiceMetadata method of the class WMS. So, we begin with the assumption
          // that both en and fr end with ".xml". Be aware that in metadataAccessPath, one language can ends with ".xml" and the
          // other not.
          layerEntryConfig.source.dataAccessPath = { en: '', fr: '' };
          // When the dataAccessPath is undefined and the metadataAccessPath does not end with ".xml", the dataAccessPath is set
          // to the same value of the corresponding metadataAccessPath.
          if (rootLayerConfig.metadataAccessPath!.en!.slice(-4).toLowerCase() !== '.xml')
            layerEntryConfig.source.dataAccessPath.en = rootLayerConfig.metadataAccessPath!.en;
          if (rootLayerConfig.metadataAccessPath!.fr!.slice(-4).toLowerCase() !== '.xml')
            layerEntryConfig.source.dataAccessPath.fr = rootLayerConfig.metadataAccessPath!.fr;
        }
        // Default value for layerEntryConfig.source.serverType is 'mapserver'.
        if (!layerEntryConfig.source.serverType) layerEntryConfig.source.serverType = 'mapserver';
      } else if (geoviewEntryIsXYZTiles(layerEntryConfig)) {
        // Value for layerEntryConfig.entryType can only be raster
        if (!layerEntryConfig.entryType) layerEntryConfig.entryType = 'raster';
        /** layerEntryConfig.source.dataAccessPath is mandatory. */
        if (!layerEntryConfig.source.dataAccessPath) {
          throw new Error(
            `source.dataAccessPath on layer entry ${Layer.getLayerPath(layerEntryConfig)} is mandatory for GeoView layer ${
              rootLayerConfig.geoviewLayerId
            } of type ${rootLayerConfig.geoviewLayerType}`
          );
        }
      } else if (geoviewEntryIsEsriDynamic(layerEntryConfig)) {
        if (Number.isNaN(layerEntryConfig.layerId)) {
          throw new Error(`The layer entry with layerId equal to ${Layer.getLayerPath(layerEntryConfig)} must be an integer string`);
        }
        // Value for layerEntryConfig.entryType can only be raster
        if (!layerEntryConfig.entryType) layerEntryConfig.entryType = 'raster';
        // if layerEntryConfig.source.dataAccessPath is undefined, we assign the metadataAccessPath of the GeoView layer to it.
        if (!layerEntryConfig.source) layerEntryConfig.source = {};
        if (!layerEntryConfig.source.dataAccessPath)
          layerEntryConfig.source.dataAccessPath = { ...rootLayerConfig.metadataAccessPath } as TypeLocalizedString;
      } else if (geoviewEntryIsEsriFeature(layerEntryConfig)) {
        if (Number.isNaN(layerEntryConfig.layerId)) {
          throw new Error(`The layer entry with layerId equal to ${Layer.getLayerPath(layerEntryConfig)} must be an integer string`);
        }
        // Default value for layerEntryConfig.entryType is vector
        if (!layerEntryConfig.entryType) layerEntryConfig.entryType = 'vector';
        // Attribute 'style' must exist in layerEntryConfig even if it is undefined
        if (!('style' in layerEntryConfig)) layerEntryConfig.style = undefined;
        // if layerEntryConfig.source.dataAccessPath is undefined, we assign the metadataAccessPath of the GeoView layer to it
        // and place the layerId at the end of it.
        // Value for layerEntryConfig.source.format can only be EsriJSON.
        if (!layerEntryConfig.source) layerEntryConfig.source = { format: 'EsriJSON' };
        if (!layerEntryConfig?.source?.format) layerEntryConfig.source.format = 'EsriJSON';
        if (!layerEntryConfig.source.dataAccessPath)
          layerEntryConfig.source.dataAccessPath = { ...rootLayerConfig.metadataAccessPath } as TypeLocalizedString;
      } else if (geoviewEntryIsWFS(layerEntryConfig)) {
        // Default value for layerEntryConfig.entryType is vector
        if (!layerEntryConfig.entryType) layerEntryConfig.entryType = 'vector';
        // Attribute 'style' must exist in layerEntryConfig even if it is undefined
        if (!('style' in layerEntryConfig)) layerEntryConfig.style = undefined;
        // if layerEntryConfig.source.dataAccessPath is undefined, we assign the metadataAccessPath of the GeoView layer to it.
        // Value for layerEntryConfig.source.format can only be WFS.
        if (!layerEntryConfig.source) layerEntryConfig.source = { format: 'WFS' };
        if (!layerEntryConfig?.source?.format) layerEntryConfig.source.format = 'WFS';
        if (!layerEntryConfig.source.dataAccessPath)
          layerEntryConfig.source.dataAccessPath = { ...rootLayerConfig.metadataAccessPath } as TypeLocalizedString;
        if (!layerEntryConfig?.source?.dataProjection) layerEntryConfig.source.dataProjection = 'EPSG:4326';
      } else if (geoviewEntryIsOgcFeature(layerEntryConfig)) {
        // Default value for layerEntryConfig.entryType is vector
        if (!layerEntryConfig.entryType) layerEntryConfig.entryType = 'vector';
        // Attribute 'style' must exist in layerEntryConfig even if it is undefined
        if (!('style' in layerEntryConfig)) layerEntryConfig.style = undefined;
        // if layerEntryConfig.source.dataAccessPath is undefined, we assign the metadataAccessPath of the GeoView layer to it.
        // Value for layerEntryConfig.source.format can only be WFS.
        if (!layerEntryConfig.source) layerEntryConfig.source = { format: 'featureAPI' };
        if (!layerEntryConfig?.source?.format) layerEntryConfig.source.format = 'featureAPI';
        if (!layerEntryConfig.source.dataAccessPath)
          layerEntryConfig.source.dataAccessPath = { ...rootLayerConfig.metadataAccessPath } as TypeLocalizedString;
        if (!layerEntryConfig?.source?.dataProjection) layerEntryConfig.source.dataProjection = 'EPSG:4326';
      } else if (geoviewEntryIsGeoPackage(layerEntryConfig)) {
        // Default value for layerEntryConfig.entryType is vector
        if (!layerEntryConfig.entryType) layerEntryConfig.entryType = 'vector';
        // Attribute 'style' must exist in layerEntryConfig even if it is undefined
        if (!('style' in layerEntryConfig)) layerEntryConfig.style = undefined;
        // if layerEntryConfig.source.dataAccessPath is undefined, we assign the metadataAccessPath of the GeoView layer to it.
        // Value for layerEntryConfig.source.format can only be GeoPackage.
        if (!layerEntryConfig.source) layerEntryConfig.source = { format: 'GeoPackage' };
        if (!layerEntryConfig?.source?.format) layerEntryConfig.source.format = 'GeoPackage';
        if (!layerEntryConfig.source.dataAccessPath)
          layerEntryConfig.source.dataAccessPath = { ...rootLayerConfig.metadataAccessPath } as TypeLocalizedString;
        if (!layerEntryConfig?.source?.dataProjection) layerEntryConfig.source.dataProjection = 'EPSG:4326';
      } else if (geoviewEntryIsGeocore(layerEntryConfig)) {
        // Default value for layerEntryConfig.entryType is vector
        if (!layerEntryConfig.entryType) layerEntryConfig.entryType = 'geocore';
      } else if (geoviewEntryIsGeoJSON(layerEntryConfig)) {
        if (!layerEntryConfig.geoviewRootLayer.metadataAccessPath && !layerEntryConfig.source?.dataAccessPath) {
          throw new Error(
            `dataAccessPath is mandatory for GeoView layer ${rootLayerConfig.geoviewLayerId} of type GeoJSON when the metadataAccessPath is undefined.`
          );
        }
        // Default value for layerEntryConfig.entryType is vector
        if (!layerEntryConfig.entryType) layerEntryConfig.entryType = 'vector';
        // Attribute 'style' must exist in layerEntryConfig even if it is undefined
        if (!('style' in layerEntryConfig)) layerEntryConfig.style = undefined;
        // if layerEntryConfig.source.dataAccessPath is undefined, we assign the metadataAccessPath of the GeoView layer to it
        // and place the layerId at the end of it.
        // Value for layerEntryConfig.source.format can only be EsriJSON.
        if (!layerEntryConfig.source) layerEntryConfig.source = { format: 'GeoJSON' };
        if (!layerEntryConfig?.source?.format) layerEntryConfig.source.format = 'GeoJSON';
        if (!layerEntryConfig.source.dataAccessPath) {
          let { en, fr } = rootLayerConfig.metadataAccessPath!;
          en = en!.split('/').length > 1 ? en!.split('/').slice(0, -1).join('/') : './';
          fr = fr!.split('/').length > 1 ? fr!.split('/').slice(0, -1).join('/') : './';
          layerEntryConfig.source.dataAccessPath = { en, fr } as TypeLocalizedString;
        }
        layerEntryConfig.source.dataAccessPath!.en = layerEntryConfig.source.dataAccessPath!.en!.endsWith('/')
          ? `${layerEntryConfig.source.dataAccessPath!.en}${layerEntryConfig.layerId}`
          : `${layerEntryConfig.source.dataAccessPath!.en}/${layerEntryConfig.layerId}`;
        layerEntryConfig.source.dataAccessPath!.fr = layerEntryConfig.source.dataAccessPath!.fr!.endsWith('/')
          ? `${layerEntryConfig.source.dataAccessPath!.fr}${layerEntryConfig.layerId}`
          : `${layerEntryConfig.source.dataAccessPath!.fr}/${layerEntryConfig.layerId}`;
        if (!layerEntryConfig?.source?.dataProjection) layerEntryConfig.source.dataProjection = 'EPSG:4326';
      }
    });
  }

  /** ***************************************************************************************************************************
   * Synchronize the English and French strings.
   * @param {TypeLocalizedString} localizedString The localized string to synchronize the en and fr string.
   * @param {TypeDisplayLanguage} sourceKey The source's key.
   * @param {TypeDisplayLanguage} destinationKey The destination's key.
   *
   * @returns {TypeMapFeaturesConfig} A valid JSON configuration object.
   */
  private SynchronizeLocalizedString(
    localizedString: TypeLocalizedString,
    sourceKey: TypeDisplayLanguage,
    destinationKey: TypeDisplayLanguage
  ) {
    localizedString[destinationKey] = localizedString[sourceKey];
  }

  /** ***************************************************************************************************************************
   * Adjust the map features configuration localized strings according to the suported languages array content.
   * @param {TypeListOfLocalizedLanguages} suportedLanguages The list of supported languages.
   * @param {TypeListOfGeoviewLayerConfig} listOfGeoviewLayerConfig The list of GeoView layer configuration to adjust according
   * to the suported languages array content.
   */
  private processLocalizedString(
    suportedLanguages: TypeListOfLocalizedLanguages,
    listOfGeoviewLayerConfig?: TypeListOfGeoviewLayerConfig
  ): void {
    if (suportedLanguages.includes('en') && suportedLanguages.includes('fr')) return;

    let sourceKey: TypeDisplayLanguage;
    let destinationKey: TypeDisplayLanguage;
    if (suportedLanguages.includes('en')) {
      sourceKey = 'en';
      destinationKey = 'fr';
    } else {
      sourceKey = 'fr';
      destinationKey = 'en';
    }

    if (listOfGeoviewLayerConfig) {
      listOfGeoviewLayerConfig.forEach((geoviewLayerConfig: TypeGeoviewLayerConfig) => {
        if (geoviewLayerConfig?.geoviewLayerName)
          this.SynchronizeLocalizedString(geoviewLayerConfig.geoviewLayerName, sourceKey, destinationKey);
        if (geoviewLayerConfig?.metadataAccessPath)
          this.SynchronizeLocalizedString(geoviewLayerConfig.metadataAccessPath, sourceKey, destinationKey);

        geoviewLayerConfig.listOfLayerEntryConfig.forEach((layerEntryConfig: TypeLayerEntryConfig) => {
          if (layerEntryConfig?.layerName) this.SynchronizeLocalizedString(layerEntryConfig.layerName!, sourceKey, destinationKey);
          if (layerEntryConfig?.source?.dataAccessPath)
            this.SynchronizeLocalizedString(layerEntryConfig.source.dataAccessPath, sourceKey, destinationKey);
          const baseVectorLayerEntryConfig = layerEntryConfig as TypeVectorLayerEntryConfig | TypeImageLayerEntryConfig;
          if (baseVectorLayerEntryConfig?.source?.featureInfo) {
            this.SynchronizeLocalizedString(baseVectorLayerEntryConfig.source.featureInfo.aliasFields!, sourceKey, destinationKey);
            this.SynchronizeLocalizedString(baseVectorLayerEntryConfig.source.featureInfo.nameField!, sourceKey, destinationKey);
            this.SynchronizeLocalizedString(baseVectorLayerEntryConfig.source.featureInfo.outfields!, sourceKey, destinationKey);
          }
        });
      });
    }
  }

  /** ***************************************************************************************************************************
   * Adjust the map features configuration to make it valid.
   * @param {TypeMapFeaturesConfig} config The map features configuration to adjust.
   *
   * @returns {TypeMapFeaturesConfig} A valid JSON configuration object.
   */
  private adjustMapConfiguration(mapFeaturesConfigToAdjuste: TypeMapFeaturesConfig): TypeMapFeaturesConfig {
    // merge default and provided configuration in a temporary object.
    const tempMapFeaturesConfig: TypeMapFeaturesConfig = {
      ...this._defaultMapFeaturesConfig,
      ...mapFeaturesConfigToAdjuste,
    };

    // do validation for every pieces
    const projection = this.validateProjection(tempMapFeaturesConfig?.map?.viewSettings?.projection);
    const center = this.validateCenter(projection, tempMapFeaturesConfig?.map?.viewSettings?.center);
    const zoom = this.validateZoom(tempMapFeaturesConfig?.map?.viewSettings?.zoom);
    const basemapOptions = this.validateBasemap(projection, tempMapFeaturesConfig?.map?.basemapOptions);
    const versionUsed = this.validateVersion(tempMapFeaturesConfig.versionUsed);
    const minZoom = this.validateMinZoom(tempMapFeaturesConfig?.map?.viewSettings?.minZoom);
    const maxZoom = this.validateMaxZoom(tempMapFeaturesConfig?.map?.viewSettings?.maxZoom);

    // recreate the prop object to remove unwanted items and check if same as original. Log the modifications
    const validMapFeaturesConfig: TypeMapFeaturesConfig = {
      map: {
        basemapOptions,
        viewSettings: {
          zoom,
          center,
          projection,
          minZoom,
          maxZoom,
        },
        interaction: tempMapFeaturesConfig.map.interaction,
        listOfGeoviewLayerConfig: tempMapFeaturesConfig.map.listOfGeoviewLayerConfig,
        extraOptions: tempMapFeaturesConfig.map.extraOptions,
      },
      theme: tempMapFeaturesConfig.theme,
      components: tempMapFeaturesConfig.components,
      corePackages: tempMapFeaturesConfig.corePackages,
      suportedLanguages: tempMapFeaturesConfig.suportedLanguages,
      triggerReadyCallback: this._triggerReadyCallback,
      displayLanguage: this._displayLanguage,
      appBar: tempMapFeaturesConfig.appBar,
      externalPackages: tempMapFeaturesConfig.externalPackages,
      versionUsed,
    };
    this.logModifs(tempMapFeaturesConfig, validMapFeaturesConfig);

    return validMapFeaturesConfig;
  }

  /** ***************************************************************************************************************************
   * Log modifications made to configuration by the validator.
   * @param {TypeMapFeaturesConfig} inputMapFeaturesConfig input config.
   * @param {TypeMapFeaturesConfig} validMapFeaturesConfig valid config.
   */
  private logModifs(inputMapFeaturesConfig: TypeMapFeaturesConfig, validMapFeaturesConfig: TypeMapFeaturesConfig): void {
    // eslint-disable-next-line array-callback-return
    Object.keys(inputMapFeaturesConfig).map((key) => {
      if (!(key in validMapFeaturesConfig)) {
        console.log(`- Map: ${this.mapId} - Key '${key}' is invalid -`);
      }
    });

    if (inputMapFeaturesConfig?.map?.viewSettings?.projection !== validMapFeaturesConfig.map.viewSettings.projection) {
      console.log(
        `- Map: ${this.mapId} - Invalid projection code ${inputMapFeaturesConfig?.map?.viewSettings?.projection} replaced by ${validMapFeaturesConfig.map.viewSettings.projection} -`
      );
    }

    if (inputMapFeaturesConfig?.map?.viewSettings?.zoom !== validMapFeaturesConfig.map.viewSettings.zoom) {
      console.log(
        `- Map: ${this.mapId} - Invalid zoom level ${inputMapFeaturesConfig?.map?.viewSettings?.zoom} replaced by ${validMapFeaturesConfig.map.viewSettings.zoom} -`
      );
    }

    if (
      JSON.stringify(inputMapFeaturesConfig?.map?.viewSettings?.center) !== JSON.stringify(validMapFeaturesConfig.map.viewSettings.center)
    ) {
      console.log(
        `- Map: ${this.mapId} - Invalid center ${inputMapFeaturesConfig?.map?.viewSettings?.center} replaced by ${validMapFeaturesConfig.map.viewSettings.center}`
      );
    }

    if (JSON.stringify(inputMapFeaturesConfig?.map?.basemapOptions) !== JSON.stringify(validMapFeaturesConfig.map.basemapOptions)) {
      console.log(
        `- Map: ${this.mapId} - Invalid basemap options ${JSON.stringify(
          inputMapFeaturesConfig?.map?.basemapOptions
        )} replaced by ${JSON.stringify(validMapFeaturesConfig.map.basemapOptions)} -`
      );
    }
  }
}
