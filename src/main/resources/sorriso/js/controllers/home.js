;
(function (win) {
    class HomeController {

		
        constructor() {

			this.latest_values = {
				"battery": 0,
				"production": 0,
				"consumption": 0,
				"grid": 0
				}
				
			this.cnt=0;	

            this.energy_flow = new EnergyFlowWidget();
            this.lucciola_widget = new HomeWidget({data:{
                id: 'lucciola',
                name: 'STORAGE LUCCIOLA',
                icon: 'home/storage.png',
                progress_type: 'Line'
            }});
            this.consumption_widget = new HomeWidget({data: {
                id: 'house-consumption',
                name: 'CONSUMI',
                icon: 'home/consumi.png'
            }});
            this.production_widget = new HomeWidget({data: {
                id: 'solar-production',
                name: 'PRODUZIONE FOTOVOLTAICO',
                icon: 'home/produzione.png'
            }});
            this.energy_widget = new HomeWidget({data: {
                id: 'sold-energy',
                name:' ENERGIA PRELEVATA DALLA RETE',
                icon: 'home/energia.png'
            }});
            this.weekly_consumption = new ValueBoxWidget({el: 'home-weekly-consume', data: {unit: '%'}});
            this.weekly_expense = new ValueBoxWidget({el: 'home-weekly-expense', data: {unit: '¢'}});
            this.weekly_chart = new TwoAreasChartWidget({el: 'home-solar-graph', data: {
                area1: {name: 'Previsione', values: [], color: 'rgba(243, 120, 14, 0.7)'},
                area2: {name: 'Produzione effettiva', values:[], color: 'rgba(34, 8, 45, 0.7)'}
            }});

            this.news_widget = new NewsWidget();

            //this.get_instant_data();
            this.start_updating_news();
            this.get_smartdatanet_data();
        }
        


        start_updating_news() {
            sorriso.DAL.listen_for_news(news_entry => {
                this.news_widget.splice('news', 0, 0, news_entry);
            });
        }
        
        get_smartdatanet_data() {
			sorriso.log('SDP','home calling DAL');
			sorriso.DAL.get_smartdatanet_data_latest(FEED_BATTERY).then(response => {
					//sorriso.log('SDP','home returning from DAL' + JSON.stringify(response));		
					this.lucciola_widget.set('value', response.values);
					this.latest_values.battery = response.values.level;
					
				}).then(() => {
                    sorriso.DAL.get_smartdatanet_data_latest(FEED_PRODUCTION).then(response => {
						//sorriso.log('SDP','home returning from DAL' + JSON.stringify(response));		
                        this.production_widget.set('value', response.values);
                        this.latest_values.production = response.values.level;
                    });
                }).then(() => {
                    sorriso.DAL.get_smartdatanet_data_latest(FEED_LOAD).then(response => {
						//sorriso.log('SDP','home returning from DAL' + JSON.stringify(response));		
                        this.consumption_widget.set('value', response.values);
                        this.latest_values.consumption = response.values.level;
                    });
                }).then(() => {
                    sorriso.DAL.get_smartdatanet_data_latest(FEED_GRID).then(response => {
						//sorriso.log('SDP','home returning from DAL' + JSON.stringify(response));		
                        this.energy_widget.set('value', response.values);
                        this.latest_values.grid = response.values.level;
                    });
                }).then(() => {
                    sorriso.DAL.get_smartdatanet_data_latest(FEED_SELFCONSUMPTION).then(response => {
						//sorriso.log('SDP','FEED_SELFCONSUMPTION home returning from DAL' + JSON.stringify(response));		
                        this.weekly_consumption.set('value', parseInt(response.values.level));
                    });
                }).then(() => {
                    sorriso.DAL.get_smartdatanet_data_latest(FEED_INSTANTCOST).then(response => {
						//sorriso.log('SDP','FEED_SELFCONSUMPTION home returning from DAL' + JSON.stringify(response));		
						var mycost = response.values.level*100
                        this.weekly_expense.set('value', mycost.toFixed(2));
                    });
                }).then(() => {
                    sorriso.DAL.get_smartdatanet_data_latestn(FEED_PRODUCTION,60).then(response => {
						//60 because it's the last hour
						//sorriso.log('LATESTN','FEED_SELFCONSUMPTION home returning from DAL' + JSON.stringify(response));		
						this.weekly_chart.set('area1.values', response.values.prevision);
                        this.weekly_chart.set('area2.values', response.values.actual);						
						
                    });
                }).then(() => {
                    sorriso.log('SDP','latest values: ' + JSON.stringify(this.latest_values))
                    
                    if(this.latest_values.production > 0 ) {
						this.energy_flow.set('direct_consumption', true);	
					} else {
						this.energy_flow.set('direct_consumption', false);	
					}
					
					if(this.latest_values.grid > 0 ) {
						this.energy_flow.set('consuming_energy', true);                   
						this.energy_flow.set('producing_energy', false); 
					} else {
						this.energy_flow.set('consuming_energy', false);  
						this.energy_flow.set('producing_energy', true);
					} 					
					
					if (this.latest_values.production >  this.latest_values.consumption) {
						if(this.latest_values.battery != 100 ) {
							this.energy_flow.set('lucciola_recharging', true);	
						} else {
							this.energy_flow.set('lucciola_recharging', false);	
						}						
					} else {
						//consumption > production
						if(this.latest_values.battery != 0 ) {
							this.energy_flow.set('lucciola_draining', true);	
						} else {
							this.energy_flow.set('lucciola_draining', false);	
						}						
						
					}
                }).then(() => {
					sorriso.loadCompleted();
					if(this.cnt==0) {
						setTimeout(() => { this.get_smartdatanet_data() }, 100); // first reload is faster, just to make sure we get all the latest_values
					} else {
						setTimeout(() => { this.get_smartdatanet_data() }, sorriso.caches.MEDIUM_TERM_EXPIRATION);
						}
                    this.cnt=this.cnt+1;
                })
		}
    }

    var NewsWidget = LazyTemplateRactive.extend({
        templateId: 'home-news-template',
        el: '#home-news',
        append: true,
        data: function() { return {
            news: [],
            format_date: function(d) {
               return moment(d).format('L');
            }
        } }
    });

    var EnergyFlowWidget = LazyTemplateRactive.extend({
        templateId: 'home-energyflow-template',
        el: '#home-diagram',
        append: true,
        data: {
            id: "home-energyflow",
            lucciola_draining: false,
            producing_energy: false,
            lucciola_recharging: false,
            direct_consumption: false,
            consuming_energy: false
        }
    });

    var HomeWidget = LazyTemplateRactive.extend({
        templateId: 'home-widget-template',
        el: '#home-diagram',
        append: true,
        data: function() { return {
            id: null,
            icon: null,
            name: null,
            progress_type: 'Circle',
            value: {level: null, unit: null, percentage: 0}
        } },
        decorators: {
            progress: function (node, percentage, progress_type) {
                var ProgressType = ProgressBar[progress_type];
                var options = {
                    color: '#FFA100',
                    strokeWidth: 7,
                    duration: 800,
                    easing: 'bounce'
                };

                if (progress_type === 'Circle')
                    options.svgStyle = { transform: 'rotate(180deg)',
                                         '-webkit-transform': 'rotate(180deg)'};
                else if (progress_type === 'Line')
                    options.svgStyle = { transform: 'rotate(270deg)',
                                         '-webkit-transform': 'rotate(270deg)'};

                var progress_circle = new ProgressType(node, options);
                progress_circle.animate(percentage/100);

                return {
                    update: function(percentage) {
                        progress_circle.animate(percentage/100);
                    },
                    teardown: function() {
                        progress_circle.destroy();
                    }
                };
            }
        }
    });

    win.HomeController = HomeController
})(window);
