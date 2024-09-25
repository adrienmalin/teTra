import { MeshStandardMaterial, Texture, Vector2 } from 'three';

export class TileMaterial extends MeshStandardMaterial {
  constructor(params, tileSizeX, tileSizeY) {
    super(params);
    this.tileSize = { value: new Vector2(tileSizeX / this.map.image.width, tileSizeY / this.map.image.height) };
  }

  onBeforeCompile(shader) {
    shader.uniforms.tileSize = this.tileSize
    shader.vertexShader = shader.vertexShader.replace(
        `void main() {`,
        `varying vec2 vUv;
        varying vec2 vOffset;
        attribute vec2 offset;
    
        void main() {
          vUv = uv;
          vOffset = offset;
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);`
    )
    shader.fragmentShader = `varying vec2 vUv;
    varying vec2 vOffset;
    //uniform sampler2D map;
    uniform vec2 tileSize;
    varying vec2 vBumpMapUvOffset;
    ` + shader.fragmentShader
    shader.fragmentShader = shader.fragmentShader.replace(
        `#include <map_fragment>`,
        `#ifdef USE_MAP
        
          vec4 sampledDiffuseColor = texture2D(map, vUv * tileSize + vOffset * tileSize);
        
          #ifdef DECODE_VIDEO_TEXTURE
        
            // use inline sRGB decode until browsers properly support SRGB8_ALPHA8 with video textures (#26516)
        
            sampledDiffuseColor = vec4( mix( pow( sampledDiffuseColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), sampledDiffuseColor.rgb * 0.0773993808, vec3( lessThanEqual( sampledDiffuseColor.rgb, vec3( 0.04045 ) ) ) ), sampledDiffuseColor.w );
          
          #endif
        
          diffuseColor *= sampledDiffuseColor;
        
        #endif`
    )
    shader.fragmentShader = shader.fragmentShader.replace(
      `#include <bumpmap_pars_fragment>`,
      `#ifdef USE_BUMPMAP

        uniform sampler2D bumpMap;
        uniform float bumpScale;
      
        // Bump Mapping Unparametrized Surfaces on the GPU by Morten S. Mikkelsen
        // https://mmikk.github.io/papers3d/mm_sfgrad_bump.pdf
      
        // Evaluate the derivative of the height w.r.t. screen-space using forward differencing (listing 2)
      
        vec2 dHdxy_fwd() {

          vec2 vBumpMapUvOffset = vBumpMapUv * tileSize + vOffset * tileSize;
      
          vec2 dSTdx = dFdx( vBumpMapUvOffset );
          vec2 dSTdy = dFdy( vBumpMapUvOffset );
      
          float Hll = bumpScale * texture2D( bumpMap, vBumpMapUvOffset ).x;
          float dBx = bumpScale * texture2D( bumpMap, vBumpMapUvOffset + dSTdx ).x - Hll;
          float dBy = bumpScale * texture2D( bumpMap, vBumpMapUvOffset + dSTdy ).x - Hll;
      
          return vec2( dBx, dBy );
      
        }
      
        vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
      
          // normalize is done to ensure that the bump map looks the same regardless of the texture's scale
          vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
          vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
          vec3 vN = surf_norm; // normalized
      
          vec3 R1 = cross( vSigmaY, vN );
          vec3 R2 = cross( vN, vSigmaX );
      
          float fDet = dot( vSigmaX, R1 ) * faceDirection;
      
          vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
          return normalize( abs( fDet ) * surf_norm - vGrad );
      
        }
      
      #endif`
    )
  }
}
