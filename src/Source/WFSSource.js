import Source from './Source';
import URLBuilder from '../Provider/URLBuilder';

/**
 * @classdesc
 * An object defining the source of resources to get from a
 * {@link http://www.opengeospatial.org/standards/wfs|WFS} server. It inherits
 * from {@link Source}.
 *
 * @extends Source
 *
 * @property {boolean} isWFSSource - Used to checkout whether this source is a
 * WFSSource. Default is true. You should not change this, as it is used
 * internally for optimisation.
 * @property {string} typeName - The name of the feature to get, used in the
 * generation of the url.
 * @property {string} version - The version of the WFS server to request on.
 * Default value is '2.0.2'.
 * @property {Object} zoom - Object containing the minimum and maximum values of
 * the level, to zoom in the source.
 * @property {number} zoom.min - The minimum level of the source. Default value
 * is 0.
 * @property {number} zoom.max - The maximum level of the source. Default value
 * is 21.
 *
 * @example
 * // Add color layer with WFS source
 * // Create the source
 * const wfsSource = new itowns.WFSSource({
 *     url: 'http://wxs.fr/wfs',
 *     version: '2.0.0',
 *     typeName: 'BDTOPO_BDD_WLD_WGS84G:bati_remarquable',
 *     projection: 'EPSG:4326',
 *     extent: {
 *         west: 4.568,
 *         east: 5.18,
 *         south: 45.437,
 *         north: 46.03,
 *     },
 *     zoom: { min: 14, max: 14 },
 *     format: 'application/json',
 * });
 *
 * // Create the layer
 * const colorlayer = new itowns.ColorLayer('color_build', {
 *     style: {
 *         fill: 'red',
 *         fillOpacity: 0.5,
 *         stroke: 'white',
 *     },
 *     source: wfsSource,
 * });
 *
 * // Add the layer
 * view.addLayer(colorlayer);
 *
 * @example
 * // Add geometry layer with WFS source
 * // Create the source
 * const wfsSource = new itowns.WFSSource({
 *     url: 'http://wxs.fr/wfs',
 *     version: '2.0.0',
 *     typeName: 'BDTOPO_BDD_WLD_WGS84G:bati_remarquable',
 *     projection: 'EPSG:4326',
 *     extent: {
 *         west: 4.568,
 *         east: 5.18,
 *         south: 45.437,
 *         north: 46.03,
 *     },
 *     zoom: { min: 14, max: 14 },
 *     format: 'application/json',
 * });
 *
 * // Create the layer
 * const geometryLayer = new itowns.GeometryLayer('mesh_build', {
 *     update: itowns.FeatureProcessing.update,
 *     convert: itowns.Feature2Mesh.convert({ extrude: () => 50 }),
 *     source: wfsSource,
 * });
 *
 * // Add the layer
 * view.addLayer(geometryLayer);
 */
class WFSSource extends Source {
    /**
     * @param {Object} source - An object that can contain all properties of a
     * WFSSource. <code>url</code>, <code>typeName</code> and
     * <code>projection</code> are mandatory.
     *
     * @constructor
     */
    constructor(source) {
        if (!source.typeName) {
            throw new Error('source.typeName is required in wfs source.');
        }

        if (!source.projection) {
            throw new Error('source.projection is required in wfs source');
        }
        super(source);

        this.isWFSSource = true;
        this.typeName = source.typeName;
        this.format = this.format || 'application/json';
        this.version = source.version || '2.0.2';

        this.url = `${source.url
        }SERVICE=WFS&REQUEST=GetFeature&typeName=${this.typeName
        }&VERSION=${this.version
        }&SRSNAME=${this.projection
        }&outputFormat=${this.format
        }&BBOX=%bbox,${this.projection}`;

        this.zoom = source.zoom || { min: 0, max: 21 };
    }

    handlingError(err, url) {
        if (err.response && err.response.status == 400) {
            return err.response.text().then((text) => {
                const getCapUrl = `${this.url}SERVICE=WFS&REQUEST=GetCapabilities&VERSION=${this.version}`;
                const xml = new DOMParser().parseFromString(text, 'application/xml');
                const errorElem = xml.querySelector('Exception');
                const errorCode = errorElem.getAttribute('exceptionCode');
                const errorMessage = errorElem.querySelector('ExceptionText').textContent;
                console.error(`Source ${this.typeName}: bad request when fetching data. Server says: "${errorCode}: ${errorMessage}". \nReviewing ${getCapUrl} may help.`, err);
                throw err;
            });
        } else {
            console.error(`Source ${this.typeName}: error while trying to fetch/parse/convert WFS data. Url was ${url}.`, err);
            throw err;
        }
    }

    urlFromExtent(extent) {
        return URLBuilder.bbox(extent.as(this.projection), this);
    }

    extentInsideLimit(extent) {
        return (extent.zoom == undefined || (extent.zoom >= this.zoom.min && extent.zoom <= this.zoom.max))
            && this.extent.intersectsExtent(extent);
    }
}

export default WFSSource;

