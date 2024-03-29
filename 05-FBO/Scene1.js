﻿// Définition de la classe Scene

// superclasses et classes nécessaires
Requires("Ground");
Requires("Pyramide");
Requires("Cow");


class Scene1
{
    /** constructeur */
    constructor()
    {
        // créer les objets à dessiner
        this.m_Pyramide = new Pyramide();
        this.m_Cow = new Cow();
        this.m_Ground = new Ground();

        // activer le depth buffer
        gl.enable(gl.DEPTH_TEST);

        // gestion souris
        this.m_Azimut = -30.0;
        this.m_Elevation = 20.0;
        this.m_Distance = 20.0;
        this.m_Clicked = false;

        // matrices
        this.m_MatV = mat4.create();
        this.m_MatVM = mat4.create();
    }


    onMouseDown(btn, x, y)
    {
        this.m_Clicked = true;
        this.m_MousePrecX = x;
        this.m_MousePrecY = y;
    }

    onMouseUp(btn, x, y)
    {
        this.m_Clicked = false;
    }

    onMouseMove(x, y)
    {
        if (! this.m_Clicked) return;
        this.m_Azimut  += (x - this.m_MousePrecX) * 0.2;
        this.m_Elevation += (y - this.m_MousePrecY) * 0.2;
        if (this.m_Elevation >  90.0) this.m_Elevation =  90.0;
        if (this.m_Elevation < -90.0) this.m_Elevation = -90.0;
        this.m_MousePrecX = x;
        this.m_MousePrecY = y;
    }

    onKeyDown(code)
    {
        switch (code) {
            case 'Z':
                this.m_Distance -= 0.5;
                break;
            case 'S':
                this.m_Distance += 0.5;
                break;
        }
    }


    onSurfaceChanged(width, height)
    {
        // met en place le viewport
        gl.viewport(0, 0, width, height);

        // matrice de projection
        this.m_MatP = mat4.create();
        mat4.perspective(this.m_MatP, Utils.radians(18.0), width / height, 0.1, 30.0);
    }


    onDrawFrame()
    {
        // effacer l'écran en bleu ciel
        gl.clearColor(0.7, 0.8, 0.9, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

        // positionner la caméra
        mat4.identity(this.m_MatV);
        mat4.translate(this.m_MatV, this.m_MatV, vec3.fromValues(0, -0.5, -this.m_Distance));

        // rotation demandée par la souris
        mat4.rotateX(this.m_MatV, this.m_MatV, Utils.radians(this.m_Elevation));
        mat4.rotateY(this.m_MatV, this.m_MatV, Utils.radians(25.0 * Utils.Time));

        // dessiner le sol
        this.m_Ground.onDraw(this.m_MatP, this.m_MatV);

        // dessiner plusieurs pyramides
        for (let pos of [
                vec3.fromValues(-2, 0.1, -1),
                vec3.fromValues( 0, 0.1, -4),
                vec3.fromValues( 1, 0.1,  4),
                vec3.fromValues( 3, 0.1,  1),
                vec3.fromValues( 3, 0.1, -2),
                vec3.fromValues(-3, 0.1,  3),
                vec3.fromValues(-4, 0.1, -2)]) {
            mat4.translate(this.m_MatVM, this.m_MatV, pos);
            this.m_Pyramide.onDraw(this.m_MatP, this.m_MatVM);
        }

        // dessiner la vache en (+1, 0, 0) en la réduisant à 20% de sa taille
        mat4.translate(this.m_MatVM, this.m_MatV, vec3.fromValues(+1, 0, 0));
        mat4.scale(this.m_MatVM, this.m_MatVM, vec3.fromValues(0.2, 0.2, 0.2));
        this.m_Cow.onDraw(this.m_MatP, this.m_MatVM);
    }


    /** supprime tous les objets de cette scène */
    destroy()
    {
        this.m_Ground.destroy();
        this.m_Pyramide.destroy();
        this.m_Cow.destroy();
    }
}
