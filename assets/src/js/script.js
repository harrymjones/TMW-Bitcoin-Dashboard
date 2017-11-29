/**
 * TMW
 * @description
 * @author Harry Jones
 *
 * Need help using JSDoc? Find out more at http://usejsdoc.org/
 */

'use-strict';

// their code e.g. npm modules
import React from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios'; /* https://github.com/mzabriskie/axios */
import $$ from 'double-dollar'; /* https://github.com/mrmartineau/double-dollar */
import {Line} from 'react-chartjs-2';

// Bundle global libs that don't return a value
import 'console';

window.$$ = $$;

const max_input = 7;
const BTC_API = 'https://api.coindesk.com/v1/bpi/currentprice.json';
const BTC_history_API = 'https://api.coindesk.com/v1/bpi/historical/close.json?';
const USD_API = 'https://openexchangerates.org/api/latest.json?app_id=724fd5fa4ef74f46b6aa591f4b75e4d8';

// Helper function for accurately rounding numbers
// http://www.jacklmoore.com/notes/rounding-in-javascript/
function round (value, decimals) {
    return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
}

function fitToInput (value) {
    var len = value.toFixed(0).length;
    if(len > max_input){
        return round(value, 0);
    } else {
        return round(value, max_input - len);
    }
}

function Currency (props) {
  return (
        <div className="currency">
            <span className="currency-name">{props.currencyName}</span>
            <input 
                type={'text'} 
                className={'currency-value'}
                name={props.currencyName} 
                onBlur={props.blurFunction} 
                onChange={props.changeFunction} 
                value={props.value} 
                maxLength={'6'}
                disabled={props.disabled}
            />
        </div>
    );
};

class TMW extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            "USDRate": "",
            "BTCRate": "",
            "BTC": "",
            "GBP": "",
            "disabled": true,
            "historicBTC": {
                "data": {
                    "labels": [],
                    "datasets": [{
                        "data": [],
                        "backgroundColor": "transparent",
                        "borderColor": "rgba(255, 255, 255, 0.05)",
                        "borderWidth": 2,
                    }]   
                },
            },
            "timestamp": "",
            "performance": "",
        };
        
        this.options = {
            "maintainAspectRatio": false,
            "legend": {
                "display": false
            },
            "tooltip": {
                "enabled": false
            },
            "scales": {
                "xAxes": [{
                    "display": false
                }],
                "yAxes": [{
                    "display": false
                }],
            },
            "elements": { 
                "point": { 
                    "radius": 0 
                } 
            }
        }
        
        this.getRates = this.getRates.bind(this);
        this.valueChange = this.valueChange.bind(this);
        this.valueBlur = this.valueBlur.bind(this);
        this.refresh = this.refresh.bind(this);
    }
    
    componentDidMount() {
        this.getRates();
    }
    
    getRates() {
        var self = this;
        //Get the BTC -> USD rate
        axios.get(BTC_API)
        .then((response) => {
            let BTCRate = response.data.bpi.USD.rate_float;
            self.setState({
                "BTCRate": BTCRate,
                "timestamp": new Date().toLocaleString()
            });
            //Get the USD -> GBP rate
            axios.get(USD_API)
            .then((response) => {
                let USDRate = response.data.rates.GBP;
                self.setState({
                    "USDRate": USDRate,
                    "BTC": 1,
                    "GBP": fitToInput(BTCRate * USDRate),
                    "disabled": false,
                }); 
                //Get historical BTC data
                axios.get(BTC_history_API)
                .then((response) => {
                    let historic = Object.values(response.data.bpi);
                    let latest = historic[historic.length-1];
                    //Sum all the values except the most recent
                    let total = 0;
                    for(let i = 0; i < historic.length-1; i++){
                        total += historic[i];
                    }
                    //Find the average
                    let avg = total / historic.length-1;
                    let performance = '';
                    if(latest > avg){
                        document.body.classList.remove('down');
                        document.body.classList.add('up');
                        performance = 'Up £' + round(latest - avg, 0) + ' on the ' + historic.length + ' day average';
                    } else {
                        document.body.classList.remove('up');
                        document.body.classList.add('down');
                        performance = 'Down £' + round(avg - latest, 0) + ' on the ' + historic.length + ' day average';
                    }
                    
                    self.setState({
                        "performance": performance,
                        "historicBTC": {
                            "data": {
                                "labels": historic,
                                "datasets": [{"data": historic}]   
                            }
                        }
                    });
                })
                .catch((error) => {
                    console.log(error);
                });
            })
            .catch((error) => {
                console.log(error);
            });
        })
        .catch((error) => {
            console.log(error);
        });
    }
    
    /*
    * When a field is changed, update the values
    */
    valueChange(e) {
        //Limit the input to numbers and dots
        const numericRegEx = /^[0-9.]*$/;
        //But also check to make sure the number is valid
        if(!isNaN(e.target.value) && numericRegEx.test(e.target.value)) {
            this.setState({[e.target.name]: e.target.value});   
            if(e.target.name === 'BTC'){
                let newVal = (e.target.value * this.state.BTCRate) * this.state.USDRate;
                newVal = fitToInput(newVal);
                this.setState({"GBP": newVal});
            } else {
                let newVal = (e.target.value / this.state.USDRate) / this.state.BTCRate;
                newVal = fitToInput(newVal);
                this.setState({"BTC": newVal});
            }
        }
    }
    
    /*
    * Don't allow empty fields
    */
    valueBlur(e) {
        let value = e.target.value;
        if(value.length === 0) this.setState({[e.target.name]: 0});
    }
    
    refresh(e) {
        e.preventDefault();
        this.getRates();
    }
    
    render () {
        return (
            <div className="main g g--alignCenter--v">
                <small className="absolute top-right">
                    {this.state.performance}
                </small>
                <Line 
                    data={this.state.historicBTC.data} 
                    options={this.options}
                />
                <div className="g-col g-span1"></div>
                <div className="g-col g-span10">
                    <div className="main g g--alignCenter--v text--center">
                        <div className="g-col g-span5--mid g-span12">
                            <Currency 
                                changeFunction={this.valueChange} 
                                blurFunction={this.valueBlur}
                                currencyName={'BTC'}
                                value={this.state.BTC} 
                                disabled={this.state.disabled}
                            />
                        </div>
                        <div className="g-col g-span2"></div>
                        <div className="g-col g-span5--mid g-span12">
                            <Currency 
                                changeFunction={this.valueChange} 
                                blurFunction={this.valueBlur}
                                currencyName={'GBP'}
                                value={this.state.GBP} 
                                disabled={this.state.disabled}
                            />
                        </div>
                    </div>
                </div>
                <div className="g-col g-span1"></div>
                <small className="absolute bottom-left">
                    Rates calculated at: {this.state.timestamp}. <a href={'#'} onClick={this.refresh}>Refresh</a>
                </small>
            </div>
        );
    }
}

ReactDOM.render(
    <TMW />,
    document.getElementById('root')
);
