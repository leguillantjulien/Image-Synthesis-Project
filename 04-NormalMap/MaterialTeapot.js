// Définition de la classe MaterialTeapot

Requires("Material");
Requires("Texture2D");


class MaterialTeapot extends Material
{
    constructor()
    {
        let nbL = 2;

        let srcVertexShader = dedent
            `#version 100

            // matrices de transformation
            uniform mat4 matP;
            uniform mat4 matVM;
            uniform mat3 matN;

            // VBO fournissant les infos des sommets
            attribute vec3 glVertex;
            attribute vec3 glNormal;
            attribute vec3 glTangent;
            attribute vec2 glTexCoords;

            // données pour le fragment shader
            varying vec4 frgPosition;
            varying vec3 frgN;
            varying vec3 frgT;
            varying vec2 frgTexCoords;

            void main()
            {
                frgPosition = matVM * vec4(glVertex, 1.0);
                gl_Position = matP * frgPosition;
                frgN = matN * glNormal;
                frgT = matN * glTangent;
                frgTexCoords = glTexCoords * 8.0;
            }`;

        let srcFragmentShader = dedent
            `#version 100
            precision mediump float;

            // caractéristiques du matériau
            uniform sampler2D texDiffuse;
            uniform sampler2D texNormale;
            const vec3 Ks = vec3(1.0, 1.0, 1.0);
            const float ns = 128.0;

            // lampes
            const int nbL = ${nbL};
            uniform vec3 LightColors[nbL];
            uniform vec4 LightPositions[nbL];

            // données venant du vertex shader
            varying vec4 frgPosition;
            varying vec3 frgN;
            varying vec3 frgT;
            varying vec2 frgTexCoords;

            void main()
            {
                // couleur diffuse
                vec3 Kd = texture2D(texDiffuse, frgTexCoords).rgb;
                vec3 V = normalize(-frgPosition.xyz);

                vec3 Tcamera = normalize(frgT);
                vec3 Ncamera = normalize(frgN);
                vec3 Bcamera = cross(Ncamera,Tcamera);
                mat3 matTBN = mat3(Tcamera,Bcamera,Ncamera);

                /// TODO construire le repère TBN
                /// TODO aller chercher la normale dans la "normal map" texNormale
                vec3 Nlocal = texture2D(texNormale,frgTexCoords).xyz * 1.5 - 0.75;

                /// TODO la mettre dans le repère global et la normaliser
                vec3 N = matTBN * Nlocal;
                N = normalize(N);
                /// TODO éclairement de Lambert et Phong ou autre
                gl_FragColor = vec4(Kd, 1.0);



                vec3 dif = vec3(0.0);
                vec3 spec = vec3(0.0);

                for(int l=0; l<nbL; l++){
                  vec3 L = LightPositions[l].xyz - (frgPosition.xyz * LightPositions[l].w);
                  //moduler l'intensité de la lampe selon la distance
                  float dist = length(L);
                  vec3 LightColorEffective = LightColors[l] / (dist*dist);
                  L = L / dist; // On normalise L

                  // calcul de Lambert
                  float D = clamp(dot(N, L), 0.0, 1.0);
                  
                  // calcul de Blinn
                  vec3 H = normalize(V + L);
                  float dotNH = clamp(dot(N, H), 0.0, 1.0);
                  float S = pow(dotNH, 100.0);



                  dif += 0.8 * Kd * D; //contribution diffuse
                  spec += 0.8 * Ks * S;
                }

                // couleur finale = diffus + ambiant
                vec3 amb = 0.2 * Kd; //contribution ambiante
                gl_FragColor = vec4(amb + dif + spec, 1.0);

            }`;

        // compile le shader, recherche les emplacements des uniform et attribute communs
        super(srcVertexShader, srcFragmentShader, "MaterialTeapot");
        this.m_LightNumber = nbL;

        // emplacement des variables uniform spécifiques
        this.m_TexDiffuseLoc     = gl.getUniformLocation(this.m_ShaderId, "texDiffuse");
        this.m_TexNormaleLoc     = gl.getUniformLocation(this.m_ShaderId, "texNormale");
        this.m_LightColorsLoc    = gl.getUniformLocation(this.m_ShaderId, "LightColors");
        this.m_LightPositionsLoc = gl.getUniformLocation(this.m_ShaderId, "LightPositions");

        // charge les images
        this.m_TexDiffuse = new Texture2D("data/BenCloward/cobblestones/diffuse.jpg", gl.LINEAR, gl.REPEAT);
        this.m_TexNormale = new Texture2D("data/BenCloward/cobblestones/normal.jpg",  gl.LINEAR, gl.REPEAT);
    }


    /**
     * définit l'ensemble des lampes
     * @param lights : tableau de Light donnant la position des lampes par rapport à la caméra
     */
    setLights(lights)
    {
        // TODO recompiler le shader si le nombre de lampes a changé
        let nblights = lights.length;
        if (nblights != this.m_LightNumber) throw "bad lights number";

        // activer le shader
        gl.useProgram(this.m_ShaderId);

        // construire un tableau regroupant les couleurs et un autre avec les positions
        let colors = new Float32Array(3*nblights);
        let positions = new Float32Array(4*nblights);
        for (let i=0; i<nblights; i++) {
            let color = lights[i].getColor();
            colors[i*3+0] = color[0];
            colors[i*3+1] = color[1];
            colors[i*3+2] = color[2];
            let position = lights[i].getPosition();
            positions[i*4+0] = position[0];
            positions[i*4+1] = position[1];
            positions[i*4+2] = position[2];
            positions[i*4+3] = position[3];
        }
        gl.uniform3fv(this.m_LightColorsLoc, colors);
        gl.uniform4fv(this.m_LightPositionsLoc, positions);
    }


    select(mesh, matP, matVM)
    {
        // méthode de la superclasse (active le shader)
        super.select(mesh, matP, matVM);

        // activer la texture sur l'unité 0
        this.m_TexDiffuse.setTextureUnit(gl.TEXTURE0, this.m_TexDiffuseLoc);
        this.m_TexNormale.setTextureUnit(gl.TEXTURE1, this.m_TexNormaleLoc);
    }


    deselect()
    {
        // libérer le sampler
        this.m_TexDiffuse.setTextureUnit(gl.TEXTURE0);
        this.m_TexNormale.setTextureUnit(gl.TEXTURE1);

        // méthode de la superclasse (désactive le shader)
        super.deselect();
    }


    destroy()
    {
        // méthode de la superclasse
        super.destroy();

        // supprimer les textures
        this.m_TexDiffuse.destroy();
        this.m_TexNormale.destroy();
    }
}
