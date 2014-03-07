var template_path = Qva.Remote + "?public=only&name=Extensions/UtilizationPlanner/";
function extension_Init() {
	// Check for jQuery
	if (typeof jQuery == 'undefined') {
	    Qva.LoadScript(template_path + 'jquery.js', function() {
	    	// Load D3
	    	Qva.LoadScript(template_path + "d3.min.js",extension_Done);
	    	});
	}
	else {
	    Qva.LoadScript(template_path + "d3.min.js",extension_Done);
	}        
}

function extension_Done(){
	//Add extension
	Qva.AddExtension('UtilizationPlanner', function(){
		//Load a CSS style sheet
		Qva.LoadCSS(template_path + "style.css");
		var _this = this;
		
		//add a unique name to the extension in order to prevent conflicts with other extensions.
		//basically, take the object ID and add it to a DIV
		var divName = _this.Layout.ObjectId.replace("\\", "_");
		if(_this.Element.children.length == 0) {
			//if this div doesn't already exist, create a unique div with the divName
			var ui = document.createElement("div");
			ui.setAttribute("id", divName);
			_this.Element.appendChild(ui);
		} else {
			//if it does exist, empty the div so we can fill it again
			$("#" + divName).empty();
		}
		
		/////// Inputs ///////

		// Hours remaining on the schedule
		var hours_sum = parseFloat(_this.Layout.Text1.text.toString());
		
		// Hours allocated per week
		var hours_per_week = 40;
		
		// Max hours allowed per week
		var week_max_hours = 60;
		
		// Hours billed so far on the schedule
		var hrsBilled = parseFloat(_this.Layout.Text0.text.toString());
		
		// Quarterly Hour Cap for rate calculation
		var hrsCap = parseFloat(_this.Layout.Text2.text.toString());
		
		// Last completed week start date
		var week_start = new Date(_this.Layout.Text3.text.toString());
		
		
		/////// Set up ///////
		
		// Chart dimensions
		var w = _this.GetWidth();
		var h = _this.GetHeight();
		// Left axis margin
		var axis_margin = 10;
		// bar offset
		var bar_offset = 10;
		// top offset: area on bottom for x-axis labels
		var top_offset = 27;
		// sidebar space for metrics
		var sidebar = 65;
		// Chart area height
		var chart_h = h-top_offset;
		// Horizontal chart width
		var x_scale_w = w-axis_margin-bar_offset-sidebar;
		// number of ticks
		var tick_num = 5;
		// date format
		var date_format = d3.time.format("%m-%d");
		// percentage format
		var formatPercent = d3.format(".2%");
		
		/////// Data set ///////
		// Initialize empty data array and indices
		var data = [];
		var data_i = [];
		
		// Fill weekly buckets
		var j = hours_sum;
		var i = 0;
		while (j>0) {
			data.push(Math.min(j,hours_per_week));
			j = j-hours_per_week;
			data_i.push(i);
			i +=1;
		}
		
		/////// Draw Graph ///////
		
		// Scale the y values
		var y = d3.scale.linear()
		    .domain([0,week_max_hours])
		    .rangeRound([chart_h,0]);
		    
		//Scale the x-values ordinally
		var x = d3.scale.ordinal()
			.domain(data_i)
			.rangeBands([axis_margin,x_scale_w]);
		
		// Drag functionality
		var drag = d3.behavior.drag()
		        .on("drag",dragmove);
		
		
		// Chart container
		var chart = d3.select("#" + divName).append("svg")
		    .attr("class","chart")
		    .attr("width",w)
		    .attr("height",h)
		    .append("g")
		    .attr("transform","translate(10,15)");
		
		// Draw the grid lines
		chart.selectAll("line")
			.data(y.ticks(tick_num))
			.enter().append("line")
			.attr("x1",axis_margin)
			.attr("x2",w - sidebar)
			.attr("y1",y)
			.attr("y2",y)
			.style("stroke","#ccc");
		
		// Add the y-axis labels
		chart.selectAll(".rule")
		    .data(y.ticks(tick_num))
		    .enter().append("text")
		    .attr("class","rule")
		    .attr("x",0)
		    .attr("y",y)
		    .attr("dx",-3)
		    .attr("dy",3)
		    .attr("text-anchor","middle")
		    .text(String);
		
		// Draw the capacity bars
		capbars = chart.selectAll(".capbar")
			.data(data)
			.enter().append("rect")
			.attr("class","capbar")
			.attr("x",function(d,i) {return bar_offset + x(i);})
			.attr("width",.9*x.rangeBand())
			.attr("y",y)
			.attr("height",function(d) {return chart_h-y(d)});
		
		
		// Create the billed bars	
		vbars= chart.selectAll(".vbar")
		    .data(data)
		    .enter().append("rect")
		    .attr("class","vbar")
		    .attr("x",function(d,i) {return bar_offset + x(i);})
		    .attr("width", .9*x.rangeBand())
		    .attr("y",y)
		    .attr("height", function(d) {return chart_h-y(d)});
		    
		// x-axis baseline
		chart.append("line")
		    .attr("x1", bar_offset)
		    .attr("x2", w-sidebar)
		    .attr("y1",chart_h)
		    .attr("y2",chart_h)
		    .style("stroke","#C8C8C8");
		    
		// x-axis labels
		chart.selectAll(".x_label")
		    .data(data)
		    .enter().append("text")
		    .attr("x",function(d,i) {return bar_offset + x(i) + .9*x.rangeBand()/2;})
		    .attr("y",chart_h+10)
		    .attr("text-anchor","middle")
		    .text(function() {week_start.setDate(week_start.getDate()+7); return date_format(week_start);});
		
		// Meters
		meters = chart.selectAll(".drag")
		    .data(data)
		    .enter().append("line")
		    .attr("class","drag")
		    .attr("x1",function(d,i) {return bar_offset-2 + x(i);})
		    .attr("x2",function(d,i) {return  bar_offset+2 + x(i) + .9*x.rangeBand();})
		    .attr("y1",y)
		    .attr("y2",y)
		    .style("stroke","#000")
		    .style("stroke-width",3)
		    .attr("cursor", "ns-resize")
		    .call(drag);
		
		// Meter text
		metertxt = chart.selectAll(".mtrtxt")
		    .data(data)
		    .enter().append("text")
		    .attr("class","mtrtxt")
		     .attr("x",function(d,i) {return bar_offset-2 + x(i);})
		    .attr("y",function(d) {return y(d)-3;})
		    .text(function(d) {return d;});
		    
		// Meter label
		meter_label = chart.append("text")
		    .attr("class","mtrlabel")
		    .attr("x",w-sidebar/2-3)
		    .attr("y",10)
		    .attr("text-anchor","middle")
		    .text("Hrs to Work");
		
		// Draw the meter sum
		meter_sum_txt = chart.append("text")
		    .attr("class","mtrsumtxt")
		    .attr("x",w-sidebar/2-3)
		    .attr("y",20)
		    .text(meterSum())
		    .attr("text-anchor","middle");
		    
		// Rate label
		meter_label_rate = chart.append("text")
		    .attr("class","mtrlabel")
		    .attr("x",w-sidebar/2-3)
		    .attr("y",40)
		    .attr("text-anchor","middle")
		    .text("Final Rate");
		    
		// Rate value
		meter_rate_txt = chart.append("text")
		    .attr("class","mtrsumtxt")
		    .attr("x",w-sidebar/2-3)
		    .attr("y",50)
		    .text(formatPercent((hrsBilled+meterSum())/hrsCap))
		    .attr("text-anchor","middle");
		
		///// Functions //////
		function meterSum() {
		     meter_num = metertxt[0].length;
		     meter_sum=0;
		     for (var j = 0; j < meter_num; j++) {
		          meter_sum += Math.floor(y.invert(parseInt(d3.select(metertxt[0][j]).attr("y"))+3));
		     }
		     return meter_sum;
		     
		}
		
		    
		function dragmove(d,i) {
		    nh = Math.max(Math.min(chart_h,d3.event.y),0);
		    d3.select(this)
		        .attr("y1",nh)
		        .attr("y2",nh);
		    d3.select(vbars[0][i])
		        .attr("y",nh)
		        .attr("height",chart_h-nh);
		    if(Math.floor(y.invert(nh))>=(d+1)) {
		    	d3.select(vbars[0][i])
		    	    .style("fill","RGB(178,24,43)");
		    	}
		    else {
		        d3.select(vbars[0][i])
		            .style("fill","RGB(146,197,222)");
		        }
		        
		    d3.select(metertxt[0][i])
		        .attr("y",nh-3)
		        .text(Math.floor(y.invert(nh)));
		    
		    d3.select(meter_sum_txt[0][0])
		        .text(meterSum());
		    
		    d3.select(meter_rate_txt[0][0])
		        .text(formatPercent((hrsBilled+meterSum())/hrsCap));
   
		}    
	});
}
//Initiate extension
extension_Init();

