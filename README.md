# jemma.osgi.webui.sorriso

*jemma.osgi.webui.sorriso* is an alternate user Interface for JEMMA. 
This bundle has been designed by [Bellissimo](http://www.bellissimo.it/) with the collaboration of partners and users of the [SORRISO](http://www.progetto-sorriso.it/) project and integrated in JEMMA by [ISMB](http://www.ismb.it).

## Building the Java part

### Generating manfest

This operation must be performed any time the dependencies/directives expressed in pom.xml are modified.

```
mvn org.apache.felix:maven-bundle-plugin:manifest
```

### Generating eclipse project

This operation is necessary to import the project in the Eclipse environment for development purposes.

```
mvn clean package eclipse:eclipse -Declipse.pde install
```

### Importing into Eclipse

To run/modify this bundle in Eclipse you must do the following steps:

- Open the IDE (eclipse)  

- Import the project: 
	- ``` File->Import-General->Existing Project into Workspace```

### Building 

This operation generates a binary of the module, ready for deployment and inclusion in the distribution.

```
mvn clean install
```

## Developing the web part

All components related to the web part must be executed from the ```src/main/resources/``` folder.

### Installing

Sorriso requires **Python** plus dependencies to build correctly, those can be installed with::

    $ pip install -r requirements.txt

In case you do not have ``pip`` installed, you can get it by running::

    $ curl https://bootstrap.pypa.io/get-pip.py | python
    
Note: you will need python-2.7 headers in your system (in debian-based systems this can be done by doing ```sudo apt-get install python2.7-dev```).    

### Configuring


Sorriso needs to connect to various API from the JEMMA system, the endpoint where
those apis are provided is configured inside the ``config.js`` file where all the
configuration options happen.

###  Compiling

Sorriso compiles to static HTML files so that it can be embedded in any other application
that is able to provide an HTTP server.

To correctly compile sorriso it is necessary to run::

    $ fab build

This will create a ``sorrisogui`` directory with the static compiled version inside.

###  Serving for Development and Testing

During the development phase it might be preferred to have a testing HTTP Server
and avoid the ``build`` phase.

This can be achieved through the ``fab serve`` command::

    $ fab serve

Which will correctly build and serve sorriso on ``http://localhost:8000/sorrisogui/home.html``.

The ``serve`` command will automatically open a browser for you and will rebuild sorriso
in case of changes to the source files.

In order to see the page on a mobile device you must edit ``sorriso/config.js``.
Replace ``JEMMA_API_URL`` variable with your IP (or where JEMMA is running).

###  Starting Jemma

You can refer to the [JEMMA project website](http://jemma.energy-home.org) for information on how to start JEMMA and deploy this component.
When the component is running, you can access the gui on ```http://jemma-ip-address:8080/sorrisogui/home.html```.

##License

This project is licensed under the [MIT](https://opensource.org/licenses/MIT) license.
