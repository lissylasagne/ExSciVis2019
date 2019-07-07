#version 150
//#extension GL_ARB_shading_language_420pack : require
#extension GL_ARB_explicit_attrib_location : require

#define TASK 10
#define ENABLE_OPACITY_CORRECTION 0
#define ENABLE_LIGHTNING 0
#define ENABLE_SHADOWING 0

in vec3 ray_entry_position;

layout(location = 0) out vec4 FragColor;

uniform mat4 Modelview;

uniform sampler3D volume_texture;
uniform sampler2D transfer_texture;


uniform vec3    camera_location;
uniform float   sampling_distance;
uniform float   sampling_distance_ref;
uniform float   iso_value;
uniform float   second_iso_value;
uniform vec3    max_bounds;
uniform ivec3   volume_dimensions;

uniform vec3    light_position;
uniform vec3    light_ambient_color;
uniform vec3    light_diffuse_color;
uniform vec3    light_specular_color;
uniform float   light_ref_coef;


bool
inside_volume_bounds(const in vec3 sampling_position)
{
    return (   all(greaterThanEqual(sampling_position, vec3(0.0)))
            && all(lessThanEqual(sampling_position, max_bounds)));
}


float
get_sample_data(vec3 in_sampling_pos)
{
    vec3 obj_to_tex = vec3(1.0) / max_bounds;
    return texture(volume_texture, in_sampling_pos * obj_to_tex).r;

}

vec3 
get_gradient(vec3 pos)
{
    vec3 voxel_size = max_bounds/volume_dimensions;

    float next_x = get_sample_data(vec3(pos.x + voxel_size.x, pos.y, pos.z));
    float prev_x = get_sample_data(vec3(pos.x - voxel_size.x, pos.y, pos.z));
    float x_total = (next_x - prev_x) / 2;

    float next_y = get_sample_data(vec3(pos.x, pos.y + voxel_size.y, pos.z));
    float prev_y = get_sample_data(vec3(pos.x, pos.y - voxel_size.y, pos.z));
    float y_total = (next_y - prev_y) / 2;

    float next_z = get_sample_data(vec3(pos.x, pos.y, pos.z + voxel_size.z));
    float prev_z = get_sample_data(vec3(pos.x, pos.y, pos.z - voxel_size.z));
    float z_total = (next_z - prev_z) / 2;

    return vec3(x_total, y_total, z_total);
}

vec3 
phong(vec3 pos) 
{
    //get normal from gradient
        vec3 normal_vec = normalize(-get_gradient(pos));

        //light ray from source to sampling position
        vec3 light_vec = normalize(light_position - pos);

        //ray from camera to sampling poaition
        vec3 camera_vec = normalize(camera_location - pos);

        //reflected ray at sampling position
        vec3 reflected_vec = normalize(reflect(light_vec, normal_vec));

        //ambient color
        vec3 ambient = light_ambient_color;

        //fiffuse color
        vec3 diffuse = light_diffuse_color * max(dot(normal_vec, light_vec), 0.0);

        //specular color
        vec3 specular = light_specular_color * pow(max(dot(reflected_vec, camera_vec), 0.0), light_ref_coef);

        return(ambient + diffuse + specular);
}

void main()
{
    /// One step trough the volume
    vec3 ray_increment      = normalize(ray_entry_position - camera_location) * sampling_distance;
    /// Position in Volume
    vec3 sampling_pos       = ray_entry_position + ray_increment; // test, increment just to be sure we are in the volume

    /// Init color of fragment
    vec4 dst = vec4(0.0, 0.0, 0.0, 0.0);

    /// check if we are inside volume
    bool inside_volume = inside_volume_bounds(sampling_pos);
    
    if (!inside_volume)
        discard;

#if TASK == 10
    vec4 max_val = vec4(0.0, 0.0, 0.0, 0.0);
    
    // the traversal loop,
    // termination when the sampling position is outside volume boundarys
    // another termination condition for early ray termination is added
    while (inside_volume) 
    {      
        // get sample
        float s = get_sample_data(sampling_pos);
                
        // apply the transfer functions to retrieve color and opacity
        vec4 color = texture(transfer_texture, vec2(s, s));
           
        // this is the example for maximum intensity projection
        max_val.r = max(color.r, max_val.r);
        max_val.g = max(color.g, max_val.g);
        max_val.b = max(color.b, max_val.b);
        max_val.a = max(color.a, max_val.a);
        
        // increment the ray sampling position
        sampling_pos  += ray_increment;

        // update the loop termination condition
        inside_volume  = inside_volume_bounds(sampling_pos);
    }

    dst = max_val;
#endif 
//task 10
    
#if TASK == 11
    vec4 avg_val = vec4(0.0, 0.0, 0.0, 0.0);
    int num_steps = 0;
    // the traversal loop,
    // termination when the sampling position is outside volume boundarys
    // another termination condition for early ray termination is added
    while (inside_volume)
    {      
        // get sample
        float s = get_sample_data(sampling_pos);

        // apply the transfer functions to retrieve color and opacity
        vec4 color = texture(transfer_texture, vec2(s, s));
           
        // this is the example for maximum intensity projection
        avg_val.r += color.r;
        avg_val.g += color.g;
        avg_val.b += color.b;
        avg_val.a += color.a;
        
        num_steps++;

        // increment the ray sampling position
        sampling_pos  += ray_increment;

        // update the loop termination condition
        inside_volume  = inside_volume_bounds(sampling_pos);
    }

    avg_val /= num_steps;
    dst = avg_val;
#endif
//task 11
    
#if TASK == 12 || TASK == 13
    // the traversal loop,
    // termination when the sampling position is outside volume boundarys
    // another termination condition for early ray termination is added
    /*while (inside_volume)
    {
        // get sample
        float s = get_sample_data(sampling_pos);
        if(s >= iso_value) 
        {
            // apply the transfer functions to retrieve color and opacity
            vec4 color = texture(transfer_texture, vec2(s, s));
            //color = vec4(get_gradient(sampling_pos), 1);
            dst = color;
            break;
        }
        // increment the ray sampling position
        sampling_pos += ray_increment;
        */
    vec3 prev_sampling_pos; // neu
    
    // threshold for floating point operations // neu
    float epsilon = 0.0001; 

    // the traversal loop,
    // termination when the sampling position is outside volume boundarys
    // another termination condition for early ray termination is added

    while (inside_volume){
        // get sample
        float s = get_sample_data(sampling_pos);

        // saves sampling pos for binary search // neu
        prev_sampling_pos = sampling_pos; 

        // increment the ray sampling position
        sampling_pos += ray_increment;

#if TASK == 13 // Binary Search
//***********************neu*****************************************************
        // gets next sample
        float next_sample = get_sample_data(sampling_pos); 

        if (s <= iso_value && next_sample >= iso_value) {
          vec3 start_pos = prev_sampling_pos;
          vec3 end_pos   = sampling_pos;
          vec3 mid_pos;
          int iterations = 0;
          bool in_shadow = false;

          while(iterations <= 64) {
            mid_pos = start_pos + (end_pos-start_pos) / 2;

            float mid_sample = get_sample_data(mid_pos);
            float difference = mid_sample - iso_value;

            if (mid_sample == iso_value || iterations == 64 || difference < epsilon && difference > -epsilon) {
              dst = texture(transfer_texture, vec2(mid_sample, mid_sample));

#if ENABLE_LIGHTNING == 1 // Add Shading

        dst = vec4(phong(sampling_pos), 1);

#if ENABLE_SHADOWING == 1 // Add Shadows

        vec3 step = normalize(light_position - sampling_pos) * sampling_distance;
        vec3 samp_pos = sampling_pos;

        bool sh_inside_volume = true;
        bool sh_hit = false;

        while(inside_volume){
            
            float s1 = get_sample_data(samp_pos + step);
            float s2 = get_sample_data(samp_pos + 2*step);
            if((s1 < iso_value && s2 > iso_value) || (s1 > iso_value && s2 < iso_value)){
                dst = vec4(vec3(0.0), 1.0);
                break;
            }
            samp_pos += step;
            inside_volume = inside_volume_bounds(samp_pos);
            
        }
#endif
#endif

              break;
            }
            else if (mid_sample < iso_value) {
              start_pos = mid_pos;
            }
            else { // mid_sample > iso_value
              end_pos = mid_pos;
            }

            ++iterations;
          }
        }
//*********************************************************************************
#else

        if (s > iso_value) { // neu
          dst = texture(transfer_texture, vec2(s, s)); // neu

#if ENABLE_LIGHTNING == 1 // Add Shading

        dst = vec4(phong(sampling_pos), 1);

#if ENABLE_SHADOWING == 1 // Add Shadows

        vec3 step = normalize(light_position - sampling_pos) * sampling_distance;
        vec3 samp_pos = sampling_pos;

        bool sh_inside_volume = true;
        bool sh_hit = false;

        while(inside_volume){
            
            float s1 = get_sample_data(samp_pos + step);
            float s2 = get_sample_data(samp_pos + 2*step);
            if((s1 < iso_value && s2 > iso_value) || (s1 > iso_value && s2 < iso_value)){
                dst = vec4(vec3(0.0), 1.0);
                break;
            }
            samp_pos += step;
            inside_volume = inside_volume_bounds(samp_pos);
            
        }
#endif
#endif 

          //break; // neu
        }

        if (s > second_iso_value) { // neu
          dst = texture(transfer_texture, vec2(s, s)); // neu
          break; // neu
        }

#endif
        // update the loop termination condition
        inside_volume = inside_volume_bounds(sampling_pos);
    }
#endif 
//task 12

#if TASK == 31
    // the traversal loop,
    // termination when the sampling position is outside volume boundarys
    // another termination condition for early ray termination is added


    float trans = 1.0; 
    vec3 inten = vec3(0.0, 0.0, 0.0);

    while (inside_volume)
    {
        // get sample
        float s = get_sample_data(sampling_pos);

        // apply the transfer functions to retrieve color and opacity
        vec4 color = texture(transfer_texture, vec2(s, s));

        //alpha value of color
        float alpha = color.a;

#if ENABLE_OPACITY_CORRECTION == 1 // Opacity Correction
        //color.a = 1 - pow((1 - color.a), 255 * sampling_distance / sampling_distance_ref);
        alpha = 1 - pow((1-alpha), sampling_distance / sampling_distance_ref);
#else
        //float s = get_sample_data(sampling_pos);
#endif
//opacity
        //sum of intensity and tranparency
        inten += color.rgb * trans * alpha;
        //product of all the trnsparencies (t0, t1*t0, t2*t1*t0 ...)
        trans *= (1-alpha);

        if (s > second_iso_value) { // neu
            inten *= 1.1;
            //dst = vec4(inten, (1-trans)*2);
        }

        dst = vec4(inten, (1-trans));

        // increment the ray sampling position
        sampling_pos += ray_increment;

#if ENABLE_LIGHTNING == 1 // Add Shading
        
        dst = vec4(phong(sampling_pos), inten);

#endif
//lighting

        // update the loop termination condition
        inside_volume = inside_volume_bounds(sampling_pos);
    }
#endif 
//task 31

    // return the calculated color value
    FragColor = dst;
}