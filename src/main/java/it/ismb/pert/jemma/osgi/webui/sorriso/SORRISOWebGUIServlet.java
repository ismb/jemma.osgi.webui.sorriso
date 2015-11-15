package it.ismb.pert.jemma.osgi.webui.sorriso;

import org.osgi.service.component.ComponentContext;
import org.osgi.service.http.HttpService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class SORRISOWebGUIServlet {

    private static final Logger LOG = LoggerFactory.getLogger(SORRISOWebGUIServlet.class);

    private HttpService httpService;

    public void activate(ComponentContext context) {
	try {
	    httpService.registerResources("/sorrisogui", "/sorrisogui", null);
	} catch (Exception e) {
	    LOG.warn("Exception",e);
	}
    }

    public void bindHttpService(HttpService httpService) {
	LOG.debug("httpService bind");
	this.httpService = httpService;
    }

    public void unbindHttpService(HttpService httpService) {
	LOG.debug("httpService unbind");
	httpService = null;
    }

}
